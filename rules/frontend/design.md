# Frontend Design Rules

BPM 프론트엔드 시각 언어 — **Apple-inspired** 토큰 시스템(`frontend/src/app/globals.css` `@theme`, 소스: `docs/DESIGN-apple (1).md`). 단일 Action Blue 액센트(`--color-accent` `#0066CC`) + parchment 서피스 + 절제된 elevation이 핵심. 새 컴포넌트·리스타일 시 준수.

## 1. Raw hex 금지 — 토큰만
- 컴포넌트(JSX/TSX/CSS)에 `#xxxxxx` 직접 사용 금지. 색은 토큰 클래스(`bg-surface`, `text-ink`, `text-accent`, `bg-accent-tint`, `border-hairline`, `text-error`, `ring-added` 등) 또는 inline style의 `var(--color-*)`로만.
- **예외(데이터/출력)**: 사용자가 노드에 지정하는 `color`와 색 팔레트 `COLOR_PRESETS`(세련된 무채도 8톤 stroke — slate/teal/sage/amber/clay/rose/violet/stone), PNG export 배경색은 데이터/출력이며 chrome이 아니다 — 유지. 노드 fill은 stroke에서 `color-mix(in srgb, {color} 18%, white)`로 파생.

## 2. Elevation — whisper soft
- 토큰 `--shadow-sm`(노드 hover) / `--shadow-md`(카드·패널·툴바) / `--shadow-lg`(플로팅 오버레이: 컨텍스트 메뉴·다이얼로그·토스트). 저확산만 — 글로우·이중 그림자 금지(엣지 선택 glow는 예외).
- 노드·엣지·플로팅 크롬에 한해 elevation 사용. 그 외 정적 영역의 깊이는 `border-hairline`/`border-divider` 또는 surface 색단계(`bg-surface` ↔ `bg-surface-alt` ↔ `bg-surface-pearl`)로.
- 캔버스 배경은 `bg-canvas`(`#F5F5F7` parchment) + dot-grid(`<Background variant="dots">`, `--color-canvas-dot`). 노드는 파스텔 fill + 1.5px 채도 stroke, 둥근 기하 일관.

## 3. 색 · 액센트
- **Action Blue** `#0066CC` — 모든 링크·primary CTA·포커스 링의 단일 브랜드 인터랙티브 색. 두 번째 브랜드 컬러 금지.
- Focus: `#0071E3` (`accent-focus`). Tint: `#E8F2FC` (`accent-tint`).
- Ink: `#1D1D1F`. Surfaces: white / parchment `#F5F5F7` / pearl `#FAFAFC`.
- Hairline: `#E0E0E0`. Divider soft: `#F0F0F0`.

## 4. 타입
- 시스템 스택 우선: `-apple-system, SF Pro Text/Display`, CJK 패리티용 Pretendard 폴백.
- 본문 17px(`text-body`), 굵기 사다리 **300/400/600**(500 금지).
- 시맨틱 스케일: `text-tagline`/`text-body-strong`/`text-body`/`text-caption`/`text-caption-strong`/`text-fine`.
- 디스플레이 헤드라인은 `tracking-tight`로 Apple tight 느낌.

## 5. Radius · 버튼 문법
- Primary CTA: **pill** (`rounded-full`) + Action Blue fill.
- Secondary: white/pearl fill + hairline border, pill 또는 `rounded-lg`(18px).
- Utility rect: `rounded-sm`(8px) — 에디터 컴팩트 컨트롤.
- 카드·유틸 패널: `rounded-lg`(18px) + hairline.

## 6. 모션
- 이징 `ease-spring`/`ease-overshoot`/`ease-smooth`, duration은 `duration-150/350/450/700`. 인터랙션(hover/entrance)에만.
- **버튼 인터랙션은 전역 base(`globals.css`)에서 처리** — 모든 `<button>`은 포인터 커서 + 클릭 시 `scale(0.97)` 눌림이 자동 적용된다(`prefers-reduced-motion` 가드 포함). 컴포넌트엔 호버 배경(`hover:bg-*` 토큰)만 추가하고, 커서·클릭 눌림을 중복 정의하지 않는다.

## 7. 언어 · 아이콘
- UI 영어 기본(동적 데이터·주석만 한글). 이모지 금지 → **Lucide 16px / strokeWidth 1.5**.

## 8. 밀도
- 생산성 화면(에디터)의 컨트롤은 컴팩트 유지(작은 패딩, `text-caption`/`text-fine`). 마케팅형 대형 여백 미적용.
- 홈·로그인·TopNav 크롬은 Apple 톤(pill CTA, parchment nav)을 따르되 SaaS 밀도 유지.

## 9. 라이트 전용
- 다크모드 미지원(데스크톱 라이트). `prefers-color-scheme: dark` 스타일 추가 금지.
- dark tile 토큰(`accent-on-dark` 등)은 예약만 — 전역 다크 테마로 쓰지 않는다.
