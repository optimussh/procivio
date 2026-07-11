# Docs guide / 문서 가이드

## Language convention / 언어 규칙

| Type / 종류 | Language / 언어 |
|-------------|-----------------|
| **Product roadmap, brand, taxonomy, master specs** under `docs/brand/`, new `docs/superpowers/specs/*` for platform strategy | **English + Korean (bilingual)** — write both so anyone can read |
| **Older feature specs/plans** (historical) | May be Korean-only or EN-only; new ones should be bilingual |
| **App UI strings** | Follow UI language toggle (`ko` / `en` in `i18n-messages.ts`) |

### Recommended format / 권장 형식

```markdown
## Section title / 절 제목

English sentence for the idea.

한국어로 같은 내용을 짧게 설명.

| English | 한국어 |
|---------|--------|
| Domain | 도메인 |
```

- Prefer **tables** for parallel EN/KO terms.
- Prefer **short paragraphs**: EN block then KO block, not mixed mid-sentence unless labels like `L3 Process / 프로세스`.
