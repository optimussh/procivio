"""Event-log process mining MVP (P4) — DFG (directly-follows graph) → GraphOut.

CSV columns (header, case-insensitive aliases):
  case_id | case | caseid
  activity | activity_name | step | task
  timestamp | time | ts | datetime  (optional; sort key if present)
"""

from __future__ import annotations

import csv
import io
from collections import Counter, defaultdict
from datetime import datetime

from app.schemas import EdgeIn, GraphOut, NodeOut

_CASE_ALIASES = {"case_id", "case", "caseid", "case id"}
_ACT_ALIASES = {"activity", "activity_name", "step", "task", "activity name"}
_TS_ALIASES = {"timestamp", "time", "ts", "datetime", "event_time", "complete_time"}


def _norm_header(h: str) -> str:
    return h.strip().lower().replace("-", "_").replace(" ", "_")


def _pick_col(fieldnames: list[str], aliases: set[str]) -> str | None:
    for f in fieldnames:
        if _norm_header(f) in aliases:
            return f
    return None


def event_log_csv_to_graph(csv_text: str, *, max_nodes: int = 40) -> GraphOut:
    """Parse CSV event log → start/process/end graph by activity order frequency."""
    reader = csv.DictReader(io.StringIO(csv_text.strip()))
    if not reader.fieldnames:
        raise ValueError("CSV has no header row")
    fields = list(reader.fieldnames)
    case_col = _pick_col(fields, _CASE_ALIASES)
    act_col = _pick_col(fields, _ACT_ALIASES)
    ts_col = _pick_col(fields, _TS_ALIASES)
    if not case_col or not act_col:
        raise ValueError(
            "CSV must include case_id (or case) and activity (or step/task) columns"
        )

    # case -> list of (ts_sort, activity)
    cases: dict[str, list[tuple[str, str]]] = defaultdict(list)
    for row in reader:
        cid = (row.get(case_col) or "").strip()
        act = (row.get(act_col) or "").strip()
        if not cid or not act:
            continue
        ts = (row.get(ts_col) or "").strip() if ts_col else ""
        cases[cid].append((ts, act))

    if not cases:
        raise ValueError("no events found in CSV")

    # sort each case by timestamp if present
    for cid, events in cases.items():
        if any(e[0] for e in events):
            def _key(e: tuple[str, str]) -> tuple:
                ts, act = e
                try:
                    return (datetime.fromisoformat(ts.replace("Z", "+00:00")), act)
                except ValueError:
                    return (ts, act)

            events.sort(key=_key)
        cases[cid] = events

    # DFG edges and activity frequency
    edge_count: Counter[tuple[str, str]] = Counter()
    act_count: Counter[str] = Counter()
    start_count: Counter[str] = Counter()
    end_count: Counter[str] = Counter()
    for events in cases.values():
        acts = [a for _, a in events]
        if not acts:
            continue
        start_count[acts[0]] += 1
        end_count[acts[-1]] += 1
        for a in acts:
            act_count[a] += 1
        for a, b in zip(acts, acts[1:], strict=False):
            edge_count[(a, b)] += 1

    # Top activities by frequency
    top_acts = [a for a, _ in act_count.most_common(max_nodes)]
    top_set = set(top_acts)
    if not top_acts:
        raise ValueError("no activities after filtering")

    # Layout: topological-ish left-to-right by first-seen average order
    order_sum: dict[str, float] = defaultdict(float)
    order_n: dict[str, int] = defaultdict(int)
    for events in cases.values():
        acts = [a for _, a in events if a in top_set]
        for i, a in enumerate(acts):
            order_sum[a] += i
            order_n[a] += 1
    rank = {
        a: (order_sum[a] / order_n[a] if order_n[a] else 0.0)
        for a in top_acts
    }
    ordered = sorted(top_acts, key=lambda a: rank[a])

    nodes: list[NodeOut] = [
        NodeOut(id="start", title="Start", node_type="start", pos_x=40, pos_y=200, sort_order=0),
    ]
    for i, act in enumerate(ordered):
        nodes.append(
            NodeOut(
                id=f"a{i}",
                title=act[:200],
                node_type="process",
                pos_x=200.0 + i * 180.0,
                pos_y=200.0,
                sort_order=i + 1,
                duration=str(act_count[act]),  # frequency as duration-ish meta
            )
        )
    nodes.append(
        NodeOut(
            id="end",
            title="End",
            node_type="end",
            pos_x=200.0 + len(ordered) * 180.0,
            pos_y=200.0,
            sort_order=len(ordered) + 1,
            is_primary_end=True,
        )
    )
    id_by_act = {act: f"a{i}" for i, act in enumerate(ordered)}

    edges: list[EdgeIn] = []
    ei = 0
    # start → most common start activities in top set
    for act, _ in start_count.most_common(5):
        if act in id_by_act:
            edges.append(
                EdgeIn(
                    id=f"es{ei}",
                    source_node_id="start",
                    target_node_id=id_by_act[act],
                    label="",
                )
            )
            ei += 1
    if not any(e.source_node_id == "start" for e in edges) and ordered:
        edges.append(
            EdgeIn(id="es0", source_node_id="start", target_node_id=id_by_act[ordered[0]])
        )

    for (a, b), cnt in edge_count.most_common(80):
        if a not in id_by_act or b not in id_by_act:
            continue
        edges.append(
            EdgeIn(
                id=f"e{ei}",
                source_node_id=id_by_act[a],
                target_node_id=id_by_act[b],
                label=str(cnt) if cnt > 1 else "",
            )
        )
        ei += 1

    for act, _ in end_count.most_common(5):
        if act in id_by_act:
            edges.append(
                EdgeIn(
                    id=f"ee{ei}",
                    source_node_id=id_by_act[act],
                    target_node_id="end",
                )
            )
            ei += 1
    if not any(e.target_node_id == "end" for e in edges) and ordered:
        edges.append(
            EdgeIn(
                id=f"ee{ei}",
                source_node_id=id_by_act[ordered[-1]],
                target_node_id="end",
            )
        )

    return GraphOut(nodes=nodes, edges=edges, groups=[])
