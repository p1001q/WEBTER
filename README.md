# WEBTER

> 웹에서 놀다, 웹터

개발자가 만든 웹 서비스를 발견하고, 설치 없이 바로 이용하며 리뷰와 반응을 나누는 **웹 서비스 스토어**입니다.
SW인재양성 프로젝트로 진행합니다.

## 기술 스택

| 영역 | 기술 |
|---|---|
| 프론트엔드 | Next.js (App Router), React, TypeScript, Tailwind CSS |
| 백엔드 | Spring Boot (Java), PostgreSQL |
| 인프라 | AWS EC2, Docker Compose, Terraform, GitHub Actions |

인프라는 구성 중입니다.

## 폴더 구조

```
WEBTER/
├─ FE/          프론트엔드 (Next.js)
├─ BE/          백엔드 (Spring Boot)
├─ IN/          인프라·배포 설정 (Terraform, Docker Compose)
├─ PM/docs/     기획서, 정책서, 화면설계서, 프로토타입
├─ .github/     CI 워크플로
└─ README.md
```

각 영역의 설정 파일은 해당 폴더 안에 두고, 루트에는 프로젝트 공통 파일만 둡니다.

## 문서

| 문서 | 내용 |
|---|---|
| [기획서](PM/docs/기획서.md) | 서비스 방향, 범위, 경쟁 분석 |
| [정책서](PM/docs/정책서.md) | 기능 규칙(권한, 상태, 등록·리뷰·신고·집계) |
| [화면설계서](PM/docs/화면설계서.md) | 화면 구성과 흐름 |
| [프로토타입](PM/docs/프로토타입.html) · [디자인시스템](PM/docs/디자인시스템.html) · [와이어프레임](PM/docs/와이어프레임.html) | 화면 시안 |

## 시작하기

- 프론트엔드: [FE/README.md](FE/README.md)
- 백엔드: [BE/README.md](BE/README.md)
- 인프라: [IN/README.md](IN/README.md)
