output "public_ip" {
  value = aws_eip.app.public_ip
}

output "app_url" {
  value = var.domain_name == "" ? "http://${aws_eip.app.public_ip}" : "https://${var.domain_name}"
}

output "instance_id" {
  value = aws_instance.app.id
}

output "data_volume_id" {
  value = aws_ebs_volume.data.id
}

output "backup_bucket" {
  value = aws_s3_bucket.backups.id
}

output "runtime_parameter_name" {
  description = "값은 Terraform 밖에서 SecureString으로 등록한다. 비밀값을 tfvars에 넣지 않는다."
  value       = local.runtime_env_name
}

output "github_actions_variables" {
  description = "GitHub Actions repository Variables에 입력할 비밀이 아닌 값."
  value = {
    AWS_REGION           = var.aws_region
    AWS_DEPLOY_ROLE_ARN  = aws_iam_role.deploy.arn
    ECR_REPOSITORY_URL   = aws_ecr_repository.app.repository_url
    EC2_INSTANCE_ID      = aws_instance.app.id
    DEPLOY_DOCUMENT_NAME = aws_ssm_document.deploy.name
  }
}

output "image_bucket" {
  description = "앱의 IMAGE_BUCKET 값."
  value       = aws_s3_bucket.images.id
}

output "image_public_base_url" {
  description = "앱의 IMAGE_PUBLIC_BASE_URL 값(이미지 주소의 앞부분)."
  value       = "https://${aws_cloudfront_distribution.images.domain_name}"
}

output "image_app_user" {
  description = "이미지 업로드 전용 IAM 사용자. 접근 키는 IN/README.md의 절차로 직접 만든다."
  value       = aws_iam_user.app_images.name
}

