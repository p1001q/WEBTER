mock_provider "aws" {
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_data "aws_partition" {
    defaults = { partition = "aws" }
  }
  mock_data "aws_availability_zones" {
    defaults = { names = ["ap-northeast-2a"] }
  }
  mock_data "aws_ssm_parameter" {
    defaults = { value = "ami-0123456789abcdef0" }
  }
  mock_resource "aws_ecr_repository" {
    defaults = {
      arn            = "arn:aws:ecr:ap-northeast-2:123456789012:repository/webter-prod"
      repository_url = "123456789012.dkr.ecr.ap-northeast-2.amazonaws.com/webter-prod"
    }
  }
  mock_resource "aws_s3_bucket" {
    defaults = { arn = "arn:aws:s3:::webter-prod-123456789012-ap-northeast-2-backups" }
  }
  mock_resource "aws_iam_openid_connect_provider" {
    defaults = { arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com" }
  }
  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::123456789012:role/webter-mock" }
  }
  mock_resource "aws_ebs_volume" {
    defaults = { id = "vol-0123456789abcdef0" }
  }
  mock_resource "aws_ssm_document" {
    defaults = { arn = "arn:aws:ssm:ap-northeast-2:123456789012:document/webter-prod-deploy" }
  }
  mock_resource "aws_instance" {
    defaults = { arn = "arn:aws:ec2:ap-northeast-2:123456789012:instance/i-0123456789abcdef0" }
  }
}

variables {
  app_port = 3000
}

run "security_and_deployment_boundaries" {
  command = apply

  assert {
    condition = (
      length(aws_vpc_security_group_ingress_rule.web) == 2 &&
      alltrue([for rule in aws_vpc_security_group_ingress_rule.web : contains([80, 443], rule.from_port)])
    )
    error_message = "외부 인바운드는 80/443만 허용해야 하며 SSH·DB·Redis·앱 내부 포트가 열려서는 안 된다."
  }
  assert {
    condition = (
      aws_instance.app.metadata_options[0].http_tokens == "required" &&
      aws_instance.app.metadata_options[0].http_put_response_hop_limit == 1 &&
      aws_ebs_volume.data.encrypted
    )
    error_message = "IMDSv2와 컨테이너의 인스턴스 자격증명 접근 제한, 데이터 EBS 암호화를 유지한다."
  }
  assert {
    condition = (
      jsondecode(aws_iam_role.deploy.assume_role_policy).Statement[0].Condition.StringEquals["token.actions.githubusercontent.com:sub"] == "repo:p1001q/WEBTER:ref:refs/heads/main"
    )
    error_message = "다른 레포·브랜치가 배포 역할을 사용할 수 없어야 한다."
  }
  assert {
    condition = (
      aws_ecr_repository.app.image_tag_mutability == "IMMUTABLE" &&
      jsondecode(aws_ssm_document.deploy.content).parameters.ImageDigest.allowedPattern == "^sha256:[a-f0-9]{64}$"
    )
    error_message = "릴리스는 변경 불가능한 태그와 제한된 digest 입력으로 배포한다."
  }
  assert {
    condition     = aws_s3_bucket_public_access_block.backups.block_public_policy && aws_s3_bucket_public_access_block.backups.restrict_public_buckets
    error_message = "DB 백업 버킷은 공개할 수 없어야 한다."
  }
  assert {
    condition     = aws_volume_attachment.data.stop_instance_before_detaching
    error_message = "DB가 실행 중인 인스턴스에서 데이터 EBS를 강제 분리해서는 안 된다."
  }
  assert {
    condition     = length(aws_instance.app.user_data_base64) <= 21848
    error_message = "압축 user-data가 EC2의 16KiB 원본 한도를 넘지 않아야 한다."
  }
}

run "existing_github_oidc_provider" {
  command = plan
  variables {
    github_oidc_provider_arn = "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
  }
  assert {
    condition     = length(aws_iam_openid_connect_provider.github) == 0
    error_message = "기존 계정 공급자를 지정하면 중복 OIDC 공급자를 만들지 않는다."
  }
}

run "reject_unplanned_postgresql_major_upgrade" {
  command = plan
  variables {
    postgres_image = "postgres:18"
  }
  expect_failures = [var.postgres_image]
}
