data "aws_caller_identity" "current" {}
data "aws_partition" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}
data "aws_ssm_parameter" "ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

locals {
  name             = "${var.project}-${var.environment}"
  az               = coalesce(var.availability_zone, data.aws_availability_zones.available.names[0])
  partition        = data.aws_partition.current.partition
  runtime_env_name = "/${var.project}/${var.environment}/runtime-env"
  runtime_env_arn  = "arn:${local.partition}:ssm:${var.aws_region}:${data.aws_caller_identity.current.account_id}:parameter${local.runtime_env_name}"
  site_address     = var.domain_name == "" ? ":80" : var.domain_name
  runtime_files = {
    "compose.yml" = file("${path.module}/../runtime/compose.yml")
    "Caddyfile" = templatefile("${path.module}/templates/Caddyfile.tftpl", {
      site_address = local.site_address
      app_port     = var.app_port
    })
    "init-db.sh"    = file("${path.module}/../runtime/init-db.sh")
    "bin/deploy.sh" = file("${path.module}/../runtime/deploy.sh")
    "bin/backup.sh" = file("${path.module}/../runtime/backup.sh")
  }
}

resource "aws_vpc" "main" {
  cidr_block           = "10.20.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = local.name }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.20.1.0/24"
  availability_zone       = local.az
  map_public_ip_on_launch = false
  tags                    = { Name = "${local.name}-public" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "app" {
  name_prefix = "${local.name}-"
  description = "Public HTTP/HTTPS only; administration uses SSM"
  vpc_id      = aws_vpc.main.id
}

resource "aws_vpc_security_group_ingress_rule" "web" {
  for_each          = toset(["80", "443"])
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = tonumber(each.value)
  to_port           = tonumber(each.value)
}

resource "aws_vpc_security_group_egress_rule" "outbound" {
  security_group_id = aws_security_group.app.id
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
}

resource "aws_ecr_repository" "app" {
  name                 = local.name
  image_tag_mutability = "IMMUTABLE"
  force_delete         = false
  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name
  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Remove untagged images after seven days; preserve tagged releases"
      selection = {
        tagStatus   = "untagged"
        countType   = "sinceImagePushed"
        countUnit   = "days"
        countNumber = 7
      }
      action = { type = "expire" }
    }]
  })
}

resource "aws_ebs_volume" "data" {
  availability_zone = local.az
  size              = var.data_volume_size_gb
  type              = "gp3"
  encrypted         = true
  tags              = { Name = "${local.name}-data" }
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket" "backups" {
  bucket        = "${local.name}-${data.aws_caller_identity.current.account_id}-${var.aws_region}-backups"
  force_destroy = false
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "backups" {
  bucket                  = aws_s3_bucket.backups.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket     = aws_s3_bucket.backups.id
  depends_on = [aws_s3_bucket_versioning.backups]
  rule {
    id     = "postgres-retention"
    status = "Enabled"
    filter { prefix = "postgres/" }
    expiration { days = 30 }
    noncurrent_version_expiration { noncurrent_days = 7 }
    abort_incomplete_multipart_upload { days_after_initiation = 1 }
  }
}

resource "aws_s3_bucket_policy" "backups" {
  bucket = aws_s3_bucket.backups.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.backups.arn, "${aws_s3_bucket.backups.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })
}

resource "aws_instance" "app" {
  ami                         = data.aws_ssm_parameter.ami.value
  instance_type               = var.instance_type
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.app.id]
  iam_instance_profile        = aws_iam_instance_profile.ec2.name
  associate_public_ip_address = false
  user_data_replace_on_change = true

  root_block_device {
    volume_size           = var.root_volume_size_gb
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }
  credit_specification {
    cpu_credits = "standard"
  }

  user_data_base64 = base64gzip(templatefile("${path.module}/templates/user-data.sh.tftpl", {
    region           = var.aws_region
    volume_id        = aws_ebs_volume.data.id
    compose_version  = var.compose_version
    runtime_env_name = local.runtime_env_name
    repository_url   = aws_ecr_repository.app.repository_url
    backup_bucket    = aws_s3_bucket.backups.id
    app_port         = var.app_port
    health_path      = var.app_health_path
    postgres_image   = var.postgres_image
    redis_image      = var.redis_image
    proxy_image      = var.proxy_image
    files            = local.runtime_files
  }))

  tags = { Name = local.name }
  depends_on = [
    aws_route_table_association.public,
    aws_iam_role_policy.ec2,
    aws_s3_bucket_public_access_block.backups,
    aws_s3_bucket_server_side_encryption_configuration.backups,
  ]
}

resource "aws_volume_attachment" "data" {
  device_name                    = "/dev/sdf"
  volume_id                      = aws_ebs_volume.data.id
  instance_id                    = aws_instance.app.id
  stop_instance_before_detaching = true
}

resource "aws_eip" "app" {
  domain = "vpc"
  tags   = { Name = local.name }
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}

resource "aws_ssm_document" "deploy" {
  name            = "${local.name}-deploy"
  document_type   = "Command"
  document_format = "JSON"
  content = jsonencode({
    schemaVersion = "2.2"
    description   = "Deploy one immutable application digest to WEBTER"
    parameters = {
      ImageDigest = {
        type           = "String"
        allowedPattern = "^sha256:[a-f0-9]{64}$"
      }
    }
    mainSteps = [{
      action = "aws:runShellScript"
      name   = "deploy"
      inputs = {
        timeoutSeconds = "900"
        runCommand = [
          "cloud-init status --wait >/dev/null 2>&1 || exit 1",
          "/opt/webter/bin/deploy.sh '{{ ImageDigest }}'"
        ]
      }
    }]
  })
}
