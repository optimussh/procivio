# Procivio — Dependency License Inventory

> **Date:** 2026-07-11  
> **Purpose:** Commercial SaaS / on-prem safety scan of **production** runtime dependencies.  
> **Scope:** `frontend/` npm production tree · `backend/` Python venv (prod requirements + transitive; some dev tools present in local venv are noted).  
> **Related:** [`license-safe-stack-and-roadmap.md`](./license-safe-stack-and-roadmap.md)

---

## Method

| Layer | Tool | Notes |
|-------|------|--------|
| Frontend | `npx license-checker --production` (summary + CSV) | Run from `frontend/` with installed `node_modules`. |
| Backend | `pip-licenses` in `backend/.venv` | Reflects packages installed in local venv. Prod direct deps from `requirements.txt`; venv also had some dev tools (pytest, ruff, …) — called out below. |

**Limitations**

- SPDX strings come from package metadata; dual-license packages need a conscious **license choice** (prefer permissive arm).
- Platform-specific optional binaries (e.g. sharp / libvips) differ by OS; Windows scan shows `@img/sharp-win32-x64`.
- This is **not** legal advice. LGPL/MPL/CC-BY still warrant counsel for distribution model (SaaS-only vs redistributing binaries).

---

## Traffic-light summary

| Status | Finding |
|--------|---------|
| **GREEN** | Dominant stack is **MIT / Apache-2.0 / BSD / ISC / 0BSD / PSF**. Core product canvas **`@xyflow/react` = MIT**. No n8n, no fair-code, no bpmn-js in tree. |
| **YELLOW** | Dual licenses (choose permissive arm); **LGPL-3** on `ldap3` and sharp platform binary; **MPL OR Apache** on DOMPurify; **CC-BY-4.0** on `caniuse-lite` (attribution). |
| **RED** | **No GPL / AGPL / SSPL / BUSL / fair-code / n8n** packages found in production trees. |

---

## Frontend summary

**Command:** `npx --yes license-checker --production --summary` (cwd: `frontend/`)

| License | Count |
|---------|------:|
| MIT | 31 |
| ISC | 11 |
| Apache-2.0 | 5 |
| BSD-3-Clause | 2 |
| Apache-2.0 AND LGPL-3.0-or-later | 1 |
| CC-BY-4.0 | 1 |
| (MPL-2.0 OR Apache-2.0) | 1 |
| UNLICENSED | 1 |
| 0BSD | 1 |
| **Total packages reported** | **54** |

### Direct production dependencies (`package.json`)

| Package | Version (range) | License (resolved) |
|---------|-----------------|--------------------|
| `@dagrejs/dagre` | ^3.0.0 | MIT |
| `@xyflow/react` | ^12.11.0 | **MIT** |
| `dompurify` | ^3.4.11 | **(MPL-2.0 OR Apache-2.0)** |
| `html-to-image` | ^1.11.13 | MIT |
| `lucide-react` | ^1.17.0 | ISC |
| `next` | 16.2.9 | MIT |
| `oidc-client-ts` | ^3.5.0 | Apache-2.0 |
| `react` / `react-dom` | 19.2.4 | MIT |
| `react-oidc-context` | ^3.3.1 | MIT |

### Notable transitive packages

| Package | License | Note |
|---------|---------|------|
| `@xyflow/system` | MIT | xyflow core |
| `zustand` | MIT | via xyflow |
| d3-* (selection, zoom, …) | ISC / BSD-3-Clause | via xyflow |
| `sharp` | Apache-2.0 | Next image pipeline |
| `@img/sharp-win32-x64` | **Apache-2.0 AND LGPL-3.0-or-later** | Platform binary (libvips-related); Linux/macOS `@img/*` variants similarly LGPL in lockfile |
| `caniuse-lite` | **CC-BY-4.0** | Browserslist data; attribution obligation |
| `tslib` | 0BSD | OK |
| `frontend@0.1.0` | **UNLICENSED** | **This app itself** (`"private": true`) — not a third-party dependency |

### `@xyflow/react` license (product-critical)

- **Package:** `@xyflow/react@12.11.0` (+ `@xyflow/system@0.0.77`)
- **License:** **MIT**
- **Repo:** https://github.com/xyflow/xyflow  
- **SaaS implication:** Suitable for commercial SaaS / proprietary product UI, subject to MIT notice retention. Aligns with stack roadmap (no bpmn.io required for current canvas).

---

## Backend summary

**Commands:** `backend\.venv\Scripts\pip-licenses` (markdown/json); production pins from `requirements.txt`.

### Unique licenses in local venv (including some dev tools)

| License | Count (approx.) |
|---------|----------------:|
| MIT / MIT License | 20 |
| BSD-3-Clause | 9 |
| BSD-2-Clause | 2 |
| BSD License (generic) | 1 |
| Apache-2.0 | 1 |
| Apache-2.0 OR BSD-3-Clause | 1 |
| Apache-2.0 OR BSD-2-Clause | 1 |
| PSF-2.0 | 1 |
| MIT AND PSF-2.0 | 1 |
| MIT-0 | 1 |
| **GNU Lesser General Public License v3 (LGPLv3)** | **1** |

> **Note:** Local venv also contained **dev** packages (e.g. `pytest`, `ruff`, `iniconfig`, `pluggy`, `Pygments`). They are **not** in `requirements.txt` production pins. Counts above are “what was installed when scanned.” Prod risk is driven by runtime deps below.

### Production direct dependencies (`requirements.txt`)

| Package | Version | License |
|---------|---------|---------|
| fastapi | 0.136.3 | MIT |
| uvicorn[standard] | 0.49.0 | BSD-3-Clause |
| pydantic-settings | 2.14.1 | MIT |
| sqlalchemy[asyncio] | 2.0.50 | MIT |
| asyncpg | 0.31.0 | Apache-2.0 |
| aiosqlite | 0.22.1 | MIT License |
| pyjwt[crypto] | 2.13.0 | MIT (+ cryptography dual) |
| httpx2 | 2.3.0 | BSD-3-Clause |
| **ldap3** | **2.9.1** | **LGPLv3** |

### Notable transitive (runtime-relevant)

| Package | License | Note |
|---------|---------|------|
| pydantic / pydantic_core | MIT | FastAPI stack |
| starlette | BSD-3-Clause | FastAPI |
| cryptography | **Apache-2.0 OR BSD-3-Clause** | via pyjwt[crypto] |
| greenlet | **MIT AND PSF-2.0** | SQLAlchemy async |
| packaging | Apache-2.0 OR BSD-2-Clause | common |
| pyasn1 | BSD-2-Clause | via ldap3 |
| cffi | MIT-0 | via cryptography |
| typing_extensions | PSF-2.0 | OK for SaaS |
| watchfiles, websockets, httptools, pyyaml, … | MIT / BSD | uvicorn[standard] extras |

---

## RED FLAG section

Criteria: **GPL, AGPL, SSPL, BUSL, fair-code, n8n-related, unknown, proprietary-looking.**

| Item | Present? | Detail |
|------|----------|--------|
| GPL (strong copyleft) | **No** | — |
| AGPL | **No** | — |
| SSPL | **No** | — |
| BUSL | **No** | — |
| Fair-code / Sustainable Use | **No** | No n8n or similar source-available SaaS-restrictive packages |
| n8n-related | **No** | Not in npm/pip trees |
| Unknown / missing license | **No** (third-party) | Only `frontend@0.1.0` is `UNLICENSED` (private app package) |
| Proprietary-looking third-party | **No** | — |
| bpmn.io / bpmn-js | **No** | Not a dependency today |

**Conclusion:** **No hard RED flags** in current production dependency trees for classic SaaS-hostile licenses (AGPL/SSPL/BUSL/fair-code). Proceed with **YELLOW** follow-ups below.

---

## YELLOW section

| Item | Where | Why watch | Suggested action |
|------|--------|-----------|------------------|
| **ldap3 — LGPLv3** | Backend direct | LGPL is weak copyleft. Typical dynamic use of the library in a server process is often acceptable, but **modifying/distributing** ldap3, or static linking narratives, need policy. | Prefer leave unmodified; document usage; legal confirm for on-prem binary ship. Long-term: evaluate Apache/MIT LDAP clients if risk appetite is zero. |
| **@img/sharp-\* — Apache-2.0 AND LGPL-3.0-or-later** | Frontend (Next/sharp) | Image pipeline ships libvips-related LGPL bits in platform packages. Common in Next.js apps; still a **binary redistrib** concern for on-prem packages. | Keep Next defaults; include notices in NOTICE file; legal check if redistributing full installers. |
| **dompurify — MPL-2.0 OR Apache-2.0** | Frontend direct | Dual; **choose Apache-2.0** arm for SaaS simplicity. MPL is file-level copyleft if that arm is used. | Document license election: Apache-2.0. |
| **cryptography / packaging — dual Apache OR BSD** | Backend transitive | Dual permissive — fine; record election if required by policy. | Prefer Apache-2.0 or BSD-3 as elected. |
| **greenlet — MIT AND PSF-2.0** | Backend transitive | Combined permissive terms. | Retain notices. |
| **caniuse-lite — CC-BY-4.0** | Frontend transitive | Not copyleft; **attribution** required. | Include attribution in open-source notices page. |
| **bpmn** | N/A | Not present; roadmap treats bpmn.io-style licenses as “re-check LICENSE/NOTICE/trademark”. | If added later → yellow gate before merge. |
| **Custom / dual / multi** | Various | Always re-verify SPDX vs upstream LICENSE file on major upgrades. | CI license gate (below). |

---

## GREEN section

Dominant licenses are **permissive** and SaaS-friendly when notices are preserved:

- **MIT** — vast majority of FE + BE (React, Next, FastAPI, SQLAlchemy, xyflow, …)
- **Apache-2.0** — oidc-client-ts, asyncpg, sharp (main), parts of dual packages
- **BSD-2-Clause / BSD-3-Clause** — starlette, uvicorn, idna, websockets, …
- **ISC** — lucide-react, many d3 modules
- **0BSD** — tslib
- **PSF-2.0 / MIT-0** — typing_extensions, cffi

**Product-critical callout:** `@xyflow/react` remains **MIT** — keep it; do not replace with AGPL/fair-code canvas stacks without a deliberate product decision.

---

## Full frontend production list (CSV extract)

| Module | License |
|--------|---------|
| @dagrejs/dagre@3.0.0 | MIT |
| @dagrejs/graphlib@4.0.1 | MIT |
| @img/colour@1.1.0 | MIT |
| @img/sharp-win32-x64@0.34.5 | Apache-2.0 AND LGPL-3.0-or-later |
| @next/env@16.2.9 | MIT |
| @next/swc-win32-x64-msvc@16.2.9 | MIT |
| @swc/helpers@0.5.15 | Apache-2.0 |
| @types/d3-* / @types/react* / trusted-types | MIT |
| @xyflow/react@12.11.0 | MIT |
| @xyflow/system@0.0.77 | MIT |
| baseline-browser-mapping@2.10.35 | Apache-2.0 |
| caniuse-lite@1.0.30001797 | CC-BY-4.0 |
| classcat@5.0.5 | MIT |
| client-only@0.0.1 | MIT |
| csstype@3.2.3 | MIT |
| d3-color / dispatch / drag / interpolate / selection / timer / transition / zoom | ISC |
| d3-ease@3.0.1 | BSD-3-Clause |
| detect-libc@2.1.2 | Apache-2.0 |
| dompurify@3.4.11 | (MPL-2.0 OR Apache-2.0) |
| frontend@0.1.0 | UNLICENSED (self) |
| html-to-image@1.11.13 | MIT |
| jwt-decode@4.0.0 | MIT |
| lucide-react@1.17.0 | ISC |
| nanoid@3.3.12 | MIT |
| next@16.2.9 | MIT |
| oidc-client-ts@3.5.0 | Apache-2.0 |
| picocolors@1.1.1 | ISC |
| postcss@8.4.31 | MIT |
| react@19.2.4 / react-dom@19.2.4 | MIT |
| react-oidc-context@3.3.1 | MIT |
| scheduler@0.27.0 | MIT |
| semver@7.8.4 | ISC |
| sharp@0.34.5 | Apache-2.0 |
| source-map-js@1.2.1 | BSD-3-Clause |
| styled-jsx@5.1.6 | MIT |
| tslib@2.8.1 | 0BSD |
| use-sync-external-store@1.6.0 | MIT |
| zustand@4.5.7 | MIT |

---

## Recommendation: CI gate (later)

1. **Frontend:** `license-checker --production --failOn 'GPL;AGPL;SSPL;BUSL'` (and explicit denylist for fair-code / known n8n packages if ever proposed).  
2. **Backend:** `pip-licenses` (or `pip-audit` + license plugin) on a **clean prod-only venv** from `requirements.txt` only (exclude `requirements-dev.txt`).  
3. **Policy allowlist:** MIT, Apache-2.0, BSD-*, ISC, 0BSD, PSF, MIT-0, CC0; duals only if a permissive arm exists.  
4. **Manual review queue:** LGPL*, MPL*, CC-BY*, UNKNOWN, ANY, UNLICENSED (third-party), proprietary.  
5. **Artifact:** generate NOTICE / third-party attributions on release; re-scan on major upgrades of Next, xyflow, FastAPI, ldap3, sharp.  
6. **Product boundary:** continue to **avoid n8n / fair-code cores** and treat any bpmn-js addition as a dedicated license review (see roadmap doc).

---

## Overall SaaS safety judgment (2026-07-11)

| Question | Answer |
|----------|--------|
| Safe to proceed commercially with current stack? | **Yes, provisionally** — no AGPL/SSPL/BUSL/fair-code in tree. |
| Must-fix before enterprise counsel? | **ldap3 (LGPL)** usage model; **sharp/libvips** redistribution for on-prem; **DOMPurify** license election; **CC-BY** attribution. |
| Canvas OK? | **`@xyflow/react` MIT — keep.** |
| Next inventory trigger | New direct dependency, or quarterly CI report. |
