# NOTICE template / 오픈소스 고지 템플릿

> Include in distribution / SaaS legal page / on-prem package.  
> 배포물·SaaS 법적 페이지·온프레 패키지에 포함.  
> Full scan: [`license-inventory.md`](./license-inventory.md)

```
Procivio
Copyright (c) 2026 Procivio contributors

This product includes third-party software.
이 제품은 제3자 오픈소스 소프트웨어를 포함합니다.

Selected components / 주요 구성:
  @xyflow/react (React Flow) — MIT
  Next.js — MIT
  FastAPI — MIT
  SQLAlchemy — MIT
  ldap3 — LGPLv3 (LDAP client; see package terms)
  dompurify — MPL-2.0 OR Apache-2.0 (prefer Apache-2.0)

Full inventory / 전체 목록: docs/brand/license-inventory.md

No Fair-code / n8n core is included.
Fair-code 및 n8n 코어는 포함하지 않습니다.
```

## Where to ship / 적용 위치

| Location EN | 위치 KO | Status |
|-------------|---------|:------:|
| Web `/legal` or settings link | 웹 고지 링크 | ✅ `/legal` + user menu |
| Docker image `/NOTICE` | 이미지 내 NOTICE | ⬜ |
| On-prem zip | 온프레 납품물 | ⬜ |
