variable "aws_region" {
  description = "AWS 배포 리전. 기본값은 서울이다."
  type        = string
  default     = "ap-northeast-2"
}

variable "project" {
  type    = string
  default = "webter"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,19}$", var.project))
    error_message = "project는 영문 소문자로 시작하는 2~20자 소문자·숫자·하이픈이다."
  }
}

variable "environment" {
  type    = string
  default = "prod"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,11}$", var.environment))
    error_message = "environment는 1~12자 소문자·숫자·하이픈이다."
  }
}

variable "github_repository" {
  type    = string
  default = "p1001q/WEBTER"
  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "owner/repository 형식으로 입력한다."
  }
}

variable "deploy_branch" {
  description = "GitHub OIDC 역할을 사용할 수 있는 브랜치. workflow의 main 조건과 함께 변경한다."
  type        = string
  default     = "main"
}

variable "github_oidc_provider_arn" {
  description = "AWS 계정에 GitHub OIDC 공급자가 이미 있으면 ARN을 입력한다. null이면 생성한다."
  type        = string
  default     = null
}

variable "instance_type" {
  description = "x86_64 T3/T3a 인스턴스. t3.small은 시작 예시이며 실부하 검증 후 조정한다."
  type        = string
  default     = "t3.small"
  validation {
    condition     = can(regex("^t3a?\\.(small|medium|large|xlarge|2xlarge)$", var.instance_type))
    error_message = "현재 AMI·이미지 아키텍처는 x86_64 T3/T3a small 이상을 지원한다."
  }
}

variable "availability_zone" {
  description = "단일 EC2와 데이터 EBS가 위치할 AZ. null이면 해당 리전의 첫 사용 가능 AZ."
  type        = string
  default     = null
}

variable "root_volume_size_gb" {
  type    = number
  default = 20
  validation {
    condition     = var.root_volume_size_gb >= 20
    error_message = "OS·이미지 공간을 위해 최소 20GiB가 필요하다."
  }
}

variable "data_volume_size_gb" {
  description = "PostgreSQL·Redis·TLS 데이터용 독립 EBS. EC2 교체 시 재사용한다."
  type        = number
  default     = 30
  validation {
    condition     = var.data_volume_size_gb >= 10
    error_message = "데이터 볼륨은 최소 10GiB로 설정한다."
  }
}

variable "app_port" {
  description = "앱 컨테이너가 0.0.0.0으로 수신하는 포트. 앱 프레임워크 확정 후 입력한다."
  type        = number
  validation {
    condition     = var.app_port >= 1024 && var.app_port <= 65535 && floor(var.app_port) == var.app_port
    error_message = "1024~65535 정수 포트를 입력한다."
  }
}

variable "app_health_path" {
  description = "앱이 인증 없이 2xx를 반환할 내부 준비 상태 경로. 앱에서 구현해야 한다."
  type        = string
  default     = "/health"
  validation {
    condition     = can(regex("^/[A-Za-z0-9/_-]*$", var.app_health_path))
    error_message = "영문·숫자·/·_·-로 구성된 절대 경로를 사용한다."
  }
}

variable "domain_name" {
  description = "선택 입력. EIP로 A 레코드를 연결하면 Caddy가 HTTPS 인증서를 발급한다. 빈 값은 IP/HTTP 점검용이다."
  type        = string
  default     = ""
  validation {
    condition     = var.domain_name == "" || can(regex("^([a-z0-9]([a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}$", var.domain_name))
    error_message = "소문자 도메인 이름만 입력한다. URL·포트·와일드카드는 허용하지 않는다."
  }
}

variable "compose_version" {
  description = "공식 Docker Compose 릴리스 버전. 부팅 시 해당 릴리스 SHA256을 검증한다."
  type        = string
  default     = "v2.39.4"
  validation {
    condition     = can(regex("^v[0-9]+\\.[0-9]+\\.[0-9]+$", var.compose_version))
    error_message = "vX.Y.Z 버전을 사용한다."
  }
}

variable "postgres_image" {
  description = "PostgreSQL 17 데이터 디렉터리 구조 기준. 메이저 변경은 별도 데이터 이전이 필요하다. digest 고정 가능."
  type        = string
  default     = "postgres:17"
  validation {
    condition     = can(regex("^postgres:17(\\.[0-9]+)?(-[A-Za-z0-9.-]+)?(@sha256:[a-f0-9]{64})?$", var.postgres_image))
    error_message = "데이터 경로 호환성을 위해 PostgreSQL 17 공식 이미지 또는 그 digest를 사용한다."
  }
}

variable "redis_image" {
  type    = string
  default = "redis:7.4-alpine"
  validation {
    condition     = can(regex("^[A-Za-z0-9._:/@-]+$", var.redis_image))
    error_message = "이미지 참조에는 공백·따옴표·셸 문자를 허용하지 않는다."
  }
}

variable "proxy_image" {
  type    = string
  default = "caddy:2-alpine"
  validation {
    condition     = can(regex("^[A-Za-z0-9._:/@-]+$", var.proxy_image))
    error_message = "이미지 참조에는 공백·따옴표·셸 문자를 허용하지 않는다."
  }
}
