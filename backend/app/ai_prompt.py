"""AI 시스템 프롬프트 구성 — 그래프 스키마 + 매뉴얼 + 현재 그래프 직렬화 (design 2026-06-15)."""

from app.schemas import AiChatTurn, GraphOut, NodeOut

# Inquire MVP — 고정 인터뷰 문항 (design 2026-07-11)
INQUIRE_GENERATE_TOKEN = "__inquire_generate__"
INQUIRE_START_TOKEN = "__inquire_start__"
INQUIRE_SCRIPT: list[tuple[str, str]] = [
    (
        "scope",
        "**(L1 Domain / L3 Process)** 도메인과 프로세스 **이름·목적**을 한 줄로 알려주세요.",
    ),
    (
        "start_end",
        "**(L3/L4)** **시작 트리거**와 **종료 조건**을 알려주세요.",
    ),
    (
        "actors",
        "**(L5 Task performers)** 주요 **역할·부서**(사람/시스템)를 알려주세요.",
    ),
    (
        "steps",
        "**(L4 Sub-Process / L5 Task)** 핵심 **단계**를 순서대로 3~7개 나열해 주세요.",
    ),
    (
        "branches",
        "**(L4)** **분기·예외**가 있으면 알려주세요. 없으면「없음」이라고 적어 주세요.",
    ),
]

_INSTRUCTIONS = """당신은 BPM 프로세스맵 편집 도우미입니다.
반드시 JSON 한 개만 반환하세요(설명 텍스트 금지).

[모드 선택]
- 빈 캔버스이거나 "그려/만들어/새로" 처럼 처음부터 생성 → graph(전체).
- [현재 그래프]가 비어있지 않고 "추가/바꿔/삭제/이동/연결/끊어/라벨/링크/설명" 처럼 일부만 편집 → ops(증분). 기존 노드의 좌표·색·담당자·그룹은 그대로 보존됩니다.
- 사용법/질문 → answer.

[graph — 전체 생성]
{"kind":"graph","message":<설명>,
 "groups":[{"key":<임시키>,"label":<그룹명>,"color":"","parent_key":null}],
 "nodes":[{"key":<임시키>,"title":<제목>,"node_type":"start|process|decision|end","description":"",
           "attributes":{"assignee":"","department":"","system":"","duration":"","url":"","url_label":"","color":""},
           "group_key":<groups의 key 또는 null>}],
 "edges":[{"source":<key>,"target":<key>,"label":""}]}
예) "구매 발주 프로세스 그려줘" → start "발주 요청" → process "견적 검토" → end.

[ops — 증분 편집]
{"kind":"ops","message":<설명>,"ops":[
  {"action":"add","node":{"key":<새임시키>,"title":...,"node_type":...,"attributes":{...},"group_key":null}},
  {"action":"connect","source":<기존id또는새키>,"target":<기존id또는새키>,"label":""},
  {"action":"disconnect","source":<기존id>,"target":<기존id>},
  {"action":"relabel","node_id":<기존id>,"title":<새제목>},
  {"action":"set_desc","node_id":<기존id>,"description":<새설명>},
  {"action":"set_edge_label","source":<기존id>,"target":<기존id>,"label":<새라벨>},
  {"action":"set_attr","node_id":<기존id>,"attributes":{"duration":"2일"}},
  {"action":"remove","node_id":<기존id>}]}
- set_attr의 attributes에는 바꿀 필드만 넣으세요 — 생략한 필드는 유지되고, 빈 문자열("")은 그 값을 지웁니다.
  url/url_label로 노드 링크를 설정합니다(url은 http:// 또는 https:// 로 시작, 지어내지 말 것).
예) "견적 검토 뒤에 '승인' 추가해" → add(승인) + connect(견적검토 id → 승인 새키).
예) "A와 B 사이에 '검수' 넣어줘" → add(검수) + disconnect(A→B) + connect(A→검수새키) + connect(검수새키→B).

[analysis — 분석/개선점 (읽기 전용, 편집 권한 불필요)]
{"kind":"analysis","message":<요약>,"findings":[
  {"severity":"high|medium|low","category":"bottleneck|orphan|cycle|missing|naming|reachability|branching|attributes|duplicate",
   "node_ids":[<관련 기존 id>],"message":<문제점>,"suggestion":<개선안>}]}
[구조 힌트]가 주어지면 각 힌트를 빠짐없이 finding으로 반영하고, 힌트 밖에서도 발견한 문제를 추가하세요.
node_ids는 [현재 그래프]의 기존 id만 사용. suggestion은 실행 가능한 구체안(누구를/어떤 값을/어디에)으로.

[walkthrough — 단계별 안내 (읽기 전용, 편집 권한 불필요)]
{"kind":"walkthrough","message":<요약>,"steps":[
  {"order":1,"node_id":<기존 id>,"narration":<설명>}]}
순서는 [현재 그래프]의 흐름(시작→끝)을 따르고, node_id는 기존 id만 사용.

[규칙]
1. graph의 edges·group_key는 같은 응답의 key 참조. ops의 node_id·source·target은 [현재 그래프]의 기존 id를 그대로 쓰고, 같은 배치에서 add한 노드는 그 새 key로 참조하세요. 좌표는 넣지 마세요(자동 배치).
2. 담당자/부서(attributes의 assignee/department)는 사용자 지시가 명시적으로 요구할 때만 설정하세요. 그 외에는 빈 문자열로 두세요(지어내지 말 것) — 빈 값은 기존 노드의 값을 유지합니다.
3. [현재 그래프]에 없는 노드를 참조하지 말고, 부득이하면 message에 그 사실을 적으세요.
4. node_type="subprocess" 노드는 다른 맵의 읽기전용 참조 — 내부를 편집(ops 대상)하지 말고 루트만 다루세요.
5. answer는 [제품 매뉴얼]에 근거해 답하고 가능하면 섹션(예: "3. 승인 워크플로우")을 인용하세요. 매뉴얼에 없는 내용은 모른다고 답하세요(지어내지 말 것).
6. 모든 message는 마크다운으로 서식화하세요 — 소제목(##)·불릿·**굵게**·표를 적극 사용해 읽기 쉽게(특히 answer·분석 요약·긴 설명). 한두 문장짜리 짧은 답은 평문도 무방합니다.
7. [현재 그래프]에 링크=가 표시된 노드를 graph(전체 재생성)에 다시 포함할 때는 그 url/url_label을 attributes에 그대로 에코해 보존하세요. 링크를 새로 지어내지는 마세요."""


def _serialize_node(node: NodeOut) -> str:
    meta: list[str] = []
    if node.assignee:
        meta.append(f"담당={node.assignee}")
    if node.department:
        meta.append(f"부서={node.department}")
    if node.system:
        meta.append(f"시스템={node.system}")
    if node.duration:
        meta.append(f"소요={node.duration}")
    if node.url:
        # 링크 노출 — 재생성(graph) 시 모델이 에코해 보존할 수 있게 (계약 규칙 ⑦)
        meta.append(f"링크={node.url}" + (f' "{node.url_label}"' if node.url_label else ""))
    if node.group_ids:
        meta.append(f"그룹={','.join(node.group_ids)}")
    suffix = f" {{{', '.join(meta)}}}" if meta else ""
    # 서브프로세스 참조는 읽기전용 컨텍스트로만 노출 (계약 규칙 ④)
    if node.node_type == "subprocess" and node.linked_map_id is not None:
        suffix += f" (subprocess→map {node.linked_map_id}, READ-ONLY)"
    return f"- {node.id} [{node.node_type}] {node.title}{suffix}"


def _serialize_graph(graph: GraphOut) -> str:
    # 노드 id를 반드시 노출 — ops/편집이 기존 노드를 참조하는 생명선 (계약 규칙 ②)
    groups = "\n".join(
        f'- {group.id} "{group.label}"'
        + (f" (parent {group.parent_group_id})" if group.parent_group_id else "")
        for group in graph.groups
    )
    nodes = "\n".join(_serialize_node(node) for node in graph.nodes)
    edges = "\n".join(
        f"- {edge.source_node_id} -> {edge.target_node_id}"
        + (f' "{edge.label}"' if edge.label else "")
        for edge in graph.edges
    )
    return (
        f"groups:\n{groups or '(없음)'}\n"
        f"nodes:\n{nodes or '(없음)'}\n"
        f"edges:\n{edges or '(없음)'}"
    )


def _has_cycle(adjacency: dict[str, list[str]]) -> bool:
    """방향 그래프 순환 탐지 — DFS 3색(WHITE/GRAY/BLACK)."""
    white, gray, black = 0, 1, 2
    color = {node: white for node in adjacency}

    def visit(node: str) -> bool:
        color[node] = gray
        for nxt in adjacency[node]:
            if color.get(nxt) == gray:
                return True
            if color.get(nxt) == white and visit(nxt):
                return True
        color[node] = black
        return False

    return any(color[node] == white and visit(node) for node in adjacency)


def _fmt_ids(ids: list[str], cap: int = 8) -> str:
    """힌트용 id 나열 — cap개까지만, 넘치면 '외 N개' (프롬프트 크기 가드)."""
    shown = ", ".join(ids[:cap])
    rest = len(ids) - cap
    return f"{shown} 외 {rest}개" if rest > 0 else shown


def _structure_hints(graph: GraphOut) -> list[str]:
    """분석 환각 감소용 구조 사전탐지 — 코드로 확정 가능한 문제를 전부 잡아 힌트로 제공.

    고아/순환(Phase 4)에 더해 도달성·분기·BPM 속성 누락·막다른 노드·중복 제목을 사전탐지(데이터 피드백 고도화).
    """
    node_ids = {node.id for node in graph.nodes}
    by_id = {node.id: node for node in graph.nodes}
    adjacency: dict[str, list[str]] = {nid: [] for nid in node_ids}
    reverse: dict[str, list[str]] = {nid: [] for nid in node_ids}
    indeg = {nid: 0 for nid in node_ids}
    outdeg = {nid: 0 for nid in node_ids}
    for edge in graph.edges:
        if edge.source_node_id in node_ids and edge.target_node_id in node_ids:
            adjacency[edge.source_node_id].append(edge.target_node_id)
            reverse[edge.target_node_id].append(edge.source_node_id)
            outdeg[edge.source_node_id] += 1
            indeg[edge.target_node_id] += 1
    hints: list[str] = []
    orphans = sorted(nid for nid in node_ids if indeg[nid] == 0 and outdeg[nid] == 0)
    if orphans:
        hints.append(f"고아 노드(연결 없음): {_fmt_ids(orphans)}")
    if _has_cycle(adjacency):
        hints.append("순환(cycle) 존재")

    def _bfs(starts: list[str], graph_map: dict[str, list[str]]) -> set[str]:
        seen = set(starts)
        queue = list(starts)
        while queue:
            for nxt in graph_map.get(queue.pop(), []):
                if nxt not in seen:
                    seen.add(nxt)
                    queue.append(nxt)
        return seen

    # 도달성 — 시작에서 못 가는 노드 / 끝으로 못 가는 노드 (고아는 위에서 이미 보고 → 제외)
    starts = [n.id for n in graph.nodes if n.node_type == "start"]
    ends = [n.id for n in graph.nodes if n.node_type == "end"]
    if not starts:
        hints.append("시작(start) 노드 없음")
    if not ends:
        hints.append("종료(end) 노드 없음")
    orphan_set = set(orphans)
    if starts:
        unreachable = sorted(node_ids - _bfs(starts, adjacency) - orphan_set)
        if unreachable:
            hints.append(f"시작에서 도달 불가: {_fmt_ids(unreachable)}")
    if ends:
        no_path_to_end = sorted(node_ids - _bfs(ends, reverse) - orphan_set)
        if no_path_to_end:
            hints.append(f"끝으로 도달 불가: {_fmt_ids(no_path_to_end)}")

    # 분기 — 출력이 2개 미만인 판단 노드, 라벨 없는 판단 분기 엣지
    weak_decisions = sorted(
        nid for nid in node_ids if by_id[nid].node_type == "decision" and outdeg[nid] < 2
    )
    if weak_decisions:
        hints.append(f"분기 없는 판단 노드(출력<2): {_fmt_ids(weak_decisions)}")
    unlabeled = sorted(
        {
            edge.source_node_id
            for edge in graph.edges
            if edge.source_node_id in node_ids
            and by_id[edge.source_node_id].node_type == "decision"
            and not edge.label
        }
    )
    if unlabeled:
        hints.append(f"분기 라벨 없는 판단 노드: {_fmt_ids(unlabeled)}")

    # 막다른 일반 노드 — end가 아닌데 출력 0 (고아 제외)
    dead_ends = sorted(
        nid
        for nid in node_ids
        if outdeg[nid] == 0 and by_id[nid].node_type not in ("end",) and nid not in orphan_set
    )
    if dead_ends:
        hints.append(f"막다른 노드(end 아님, 출력 0): {_fmt_ids(dead_ends)}")

    # BPM 속성 누락 — process/decision의 소요시간 (담당자·부서는 명시 요청 시에만 채우는 값이라 사전탐지 대상에서 제외)
    for label, field in (("소요시간", "duration"),):
        empty = sorted(
            node.id
            for node in graph.nodes
            if node.node_type in ("process", "decision") and not getattr(node, field)
        )
        if empty:
            hints.append(f"{label} 미입력: {_fmt_ids(empty)}")

    # 중복 제목 — 같은 이름의 노드
    seen_titles: dict[str, list[str]] = {}
    for node in graph.nodes:
        seen_titles.setdefault(node.title.strip(), []).append(node.id)
    dupes = {title: ids for title, ids in seen_titles.items() if title and len(ids) > 1}
    for title, ids in sorted(dupes.items()):
        hints.append(f'중복 제목 "{title}": {_fmt_ids(sorted(ids))}')
    return hints


def build_system_prompt(
    manual: str,
    current_graph: GraphOut,
    can_edit: bool,
) -> str:
    edit_note = (
        "사용자는 현재 이 맵을 편집할 수 있습니다(graph/ops 가능)."
        if can_edit
        else "사용자는 편집 권한이 없습니다 — graph/ops는 만들지 말고 answer/analysis/walkthrough(읽기 전용)로만 답하세요."
    )
    hints = _structure_hints(current_graph)
    hint_block = (
        "[구조 힌트]\n" + "\n".join(f"- {hint}" for hint in hints) + "\n\n" if hints else ""
    )
    return (
        f"{_INSTRUCTIONS}\n{edit_note}\n\n"
        f"{hint_block}"
        f"[현재 그래프]\n{_serialize_graph(current_graph)}\n\n"
        f"[제품 매뉴얼]\n{manual}"
    )


def build_messages(
    manual: str,
    current_graph: GraphOut,
    can_edit: bool,
    instruction: str,
    history: list[AiChatTurn],
) -> list[dict]:
    messages: list[dict] = [
        {
            "role": "system",
            "content": build_system_prompt(manual, current_graph, can_edit),
        }
    ]
    for turn in history:
        messages.append({"role": turn.role, "content": turn.content})
    messages.append({"role": "user", "content": instruction})
    return messages


def inquire_question_text(step_index: int) -> str:
    """0-based 문항 문구 — 범위 밖이면 빈 문자열."""
    if step_index < 0 or step_index >= len(INQUIRE_SCRIPT):
        return ""
    n = step_index + 1
    total = len(INQUIRE_SCRIPT)
    _, prompt = INQUIRE_SCRIPT[step_index]
    return f"**질문 {n}/{total}**\n\n{prompt}"


def advance_inquire(
    *,
    step: int | None,
    answers: dict[str, str],
    instruction: str,
) -> tuple[dict[str, str], int, str, bool]:
    """인터뷰 한 턴 진행.

    Returns:
        (누적 answers, next_step 인덱스, assistant message, done)
    - start 토큰: 첫 질문, step=0, answers 유지
    - 일반 답: 현재 step 키에 저장 후 다음 질문 또는 완료 안내
    """
    cleaned = {k: v.strip() for k, v in answers.items() if v and str(v).strip()}
    text = instruction.strip()

    if text == INQUIRE_START_TOKEN or text == "":
        msg = inquire_question_text(0)
        return cleaned, 0, msg, False

    # 현재 답변 대상 스텝 — 클라이언트가 보낸 inquire_step, 없으면 답변 개수
    current = step if step is not None else min(len(cleaned), len(INQUIRE_SCRIPT) - 1)
    current = max(0, min(current, len(INQUIRE_SCRIPT) - 1))
    key = INQUIRE_SCRIPT[current][0]
    if text and text not in (INQUIRE_GENERATE_TOKEN, INQUIRE_START_TOKEN):
        cleaned[key] = text

    next_step = current + 1
    if next_step >= len(INQUIRE_SCRIPT):
        done_msg = (
            "인터뷰 문항을 모두 받았습니다. "
            "아래 **초안 생성**을 누르면 프로세스맵 초안을 만듭니다. "
            "답변을 고치려면 해당 내용을 다시 보내 주세요."
        )
        return cleaned, len(INQUIRE_SCRIPT), done_msg, True

    return cleaned, next_step, inquire_question_text(next_step), False


def build_inquire_generate_messages(
    *,
    manual: str,
    current_graph: GraphOut,
    can_edit: bool,
    answers: dict[str, str],
) -> list[dict]:
    """인터뷰 답변 → graph JSON 생성용 메시지."""
    lines = ["[인터뷰 답변]"]
    for key, prompt in INQUIRE_SCRIPT:
        val = answers.get(key, "").strip() or "(미응답)"
        lines.append(f"- {key}: {val}")
    answers_block = "\n".join(lines)
    user = (
        f"{answers_block}\n\n"
        "위 인터뷰를 바탕으로 프로세스맵 전체를 kind=graph JSON 한 개로 작성하세요. "
        "start 1개 → process/decision들 → end 1개 이상 흐름을 만들고, "
        "actors는 답변에 있을 때만 attributes.department 또는 그룹 라벨에 반영하세요 "
        "(없으면 빈 문자열). "
        "branches가 있으면 decision 노드와 라벨 있는 edge로 표현하세요. "
        "담당자/부서는 답변에 명시된 경우만 설정하세요."
    )
    return [
        {
            "role": "system",
            "content": build_system_prompt(manual, current_graph, can_edit),
        },
        {"role": "user", "content": user},
    ]


# 트랜스크립트 산업 힌트 — 시드 트리 전체가 아니라 짧은 어휘만 (design 2026-07-11)
_INDUSTRY_HINTS: dict[str, str] = {
    "antibody": "도메인 힌트: 항체 의약품(mAb) — 영업·세포배양·정제·구매·생산계획·자재.",
    "semiconductor": (
        "도메인 힌트: 메모리 반도체 FAB — 사진(coat/expose/develop/CD), "
        "식각, 확산, 박막, Probe, 테스트."
    ),
    "battery": "도메인 힌트: 이차전지 — 전극 코팅, 셀 조립, 포메이션, 모듈·팩.",
}


def build_transcript_generate_messages(
    *,
    manual: str,
    current_graph: GraphOut,
    can_edit: bool,
    transcript: str,
    focus: str = "",
    industry_hint: str = "",
    variant: str = "single",
) -> list[dict]:
    """회의록·인터뷰 전문 → kind=graph 전용 메시지 (design 2026-07-11)."""
    hint_key = (industry_hint or "").strip().lower()
    hint_line = _INDUSTRY_HINTS.get(hint_key, "")
    if industry_hint.strip() and not hint_line and hint_key not in ("", "none"):
        hint_line = f"도메인 힌트(사용자): {industry_hint.strip()[:200]}"
    focus_line = f"초점: {focus.strip()}\n" if focus.strip() else ""
    extra = f"{hint_line}\n" if hint_line else ""
    v = (variant or "single").strip().lower()
    if v == "as_is":
        mode_line = (
            "모드: As-Is(현재 상태). 지금 실제로 하는 흐름만 맵으로 그리세요. "
            "개선안·미래 제안은 제외하세요.\n"
        )
    elif v == "to_be":
        mode_line = (
            "모드: To-Be(목표 상태). 개선·자동화·간소화가 반영된 목표 프로세스를 맵으로 그리세요. "
            "현재 병목은 해소한 흐름으로 표현하세요.\n"
        )
    else:
        mode_line = ""
    user = (
        "다음 인터뷰·회의 텍스트만 근거로 프로세스맵 JSON(kind=graph)을 만드세요.\n"
        f"{mode_line}"
        "텍스트에 없는 담당자·시스템·단계를 지어내지 마세요(명시되지 않으면 빈 문자열).\n"
        "node_type은 start|process|decision|end 만. subprocess 노드는 만들지 마세요.\n"
        "process 노드는 가능하면 5~15개. decision은 분기 라벨을 달으세요.\n"
        "start 1개와 end 1개 이상을 포함하세요.\n"
        f"{extra}{focus_line}"
        f"--- 트랜스크립트 ---\n{transcript}\n--- 끝 ---"
    )
    return build_messages(
        manual=manual,
        current_graph=current_graph,
        can_edit=can_edit,
        instruction=user,
        history=[],
    )
