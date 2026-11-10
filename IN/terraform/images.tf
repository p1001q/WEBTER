# 서비스 이미지(아이콘·썸네일·미리보기) 저장소. 비공개 S3 버킷에 CloudFront를 앞에 두고,
# 브라우저가 일회용 주소(앱이 발급)로 버킷에 직접 올린다(정책서 4.4). DB 백업 버킷과 분리한다.

resource "aws_s3_bucket" "images" {
  bucket        = "${local.name}-${data.aws_caller_identity.current.account_id}-${var.aws_region}-images"
  force_destroy = false
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_public_access_block" "images" {
  bucket                  = aws_s3_bucket.images.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# 브라우저의 직접 업로드(PUT)를 프론트엔드 도메인에서만 허용한다. 도메인을 정하기 전(빈 목록)에는 만들지 않는다.
resource "aws_s3_bucket_cors_configuration" "images" {
  count  = length(var.image_upload_origins) > 0 ? 1 : 0
  bucket = aws_s3_bucket.images.id
  cors_rule {
    allowed_origins = var.image_upload_origins
    allowed_methods = ["PUT"]
    allowed_headers = ["Content-Type"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload { days_after_initiation = 1 }
  }
}

# 읽기는 CloudFront를 통해서만 한다(버킷은 직접 공개하지 않는다)
resource "aws_cloudfront_origin_access_control" "images" {
  name                              = "${local.name}-images"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "images" {
  enabled         = true
  is_ipv6_enabled = true
  comment         = "${local.name} 서비스 이미지"
  price_class     = "PriceClass_200"

  origin {
    domain_name              = aws_s3_bucket.images.bucket_regional_domain_name
    origin_id                = "images"
    origin_access_control_id = aws_cloudfront_origin_access_control.images.id
  }

  default_cache_behavior {
    target_origin_id       = "images"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    # AWS 관리형 정책 CachingOptimized
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}

resource "aws_s3_bucket_policy" "images" {
  bucket = aws_s3_bucket.images.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource  = [aws_s3_bucket.images.arn, "${aws_s3_bucket.images.arn}/*"]
        Condition = { Bool = { "aws:SecureTransport" = "false" } }
      },
      {
        Sid       = "AllowCloudFrontRead"
        Effect    = "Allow"
        Principal = { Service = "cloudfront.amazonaws.com" }
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.images.arn}/uploads/*"
        Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.images.arn } }
      }
    ]
  })
  depends_on = [aws_s3_bucket_public_access_block.images]
}

# 앱이 업로드 주소를 발급하고(PutObject) 올린 파일을 확인할 때(GetObject) 쓰는 전용 사용자.
# 접근 키는 Terraform 상태에 비밀값이 남지 않도록 여기서 만들지 않는다. IN/README.md의 절차대로 직접 만들어
# 런타임 값(SSM)에 넣는다. 컨테이너의 EC2 역할 접근 제한(IMDS 홉 제한 1)은 그대로 둔다.
resource "aws_iam_user" "app_images" {
  name = "${local.name}-app-images"
}

resource "aws_iam_user_policy" "app_images" {
  name = "image-upload"
  user = aws_iam_user.app_images.name
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid      = "UploadAndVerifyImages"
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:GetObject"]
      Resource = "${aws_s3_bucket.images.arn}/uploads/*"
    }]
  })
}
