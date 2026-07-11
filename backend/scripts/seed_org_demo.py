"""종합 데모 시드 — 조직도 + 직원 ~400 + 그룹 6 + 산업군별 L1–L4 프로세스맵.

Structure 루트 = 산업군(L1 Domain):
  · Antibody Therapeutics / 항체 의약품
  · Memory Semiconductor / 메모리 반도체 (Hynix-style FAB)
  · EV Battery / 이차전지

각 산업 아래 L2 도메인(영업·FAB 모듈·전극 등) → L3 Process → L4 Sub-Process.
parent_map_id 트리 + Call Activity(linked_map_id) 드릴다운.
subprocess 입·출력 핸들: target_handle="in", source_handle="__primary__".
"""

from __future__ import annotations

import random
from datetime import timedelta
from typing import Any

from scripts.seed_semi_hynix import SEMI_FLOW_STEPS, build_semi_maps

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import workflow
from app.clock import now as now_kst
from app.models import (
    Edge,
    Employee,
    MapApprover,
    MapPermission,
    MapVersion,
    Node,
    ProcessMap,
    UserGroup,
    UserGroupMember,
    VersionApproval,
    VersionEvent,
)

RNG = random.Random(42)

# subprocess Call Activity 핸들 id — frontend subprocess-embed.ts 와 동일
SP_IN = "in"
SP_OUT = "__primary__"

ORG_TREE: dict = {
    "Commercial Center": {
        "Sales Office": {
            "Key Account Team": ["KA Part 1", "KA Part 2"],
            "Tender Team": ["Tender Part 1"],
            "Market Access Team": [],
        },
        "Marketing Office": {
            "Brand Team": ["Brand Part 1", "Brand Part 2"],
            "Medical Affairs Team": [],
        },
    },
    "Manufacturing Center": {
        "Upstream Office": {
            "Cell Culture Team": ["Seed Part", "Production Culture Part"],
            "Media Prep Team": [],
        },
        "Downstream Office": {
            "Purification Team": ["Capture Part", "Polish Part"],
            "Viral Clearance Team": [],
        },
        "Fill Finish Office": None,
        "Fab Photo Office": {
            "Litho Team": ["Coat Part", "Expose Part"],
            "Metrology Team": [],
        },
        "Fab Etch Office": {
            "Dielectric Etch Team": ["Etch Part 1"],
            "Conductor Etch Team": [],
        },
    },
    "Supply Chain Center": {
        "Planning Office": {
            "MPS Team": ["Demand Part", "Capacity Part"],
            "Campaign Team": [],
            "Dispatch Team": [],
        },
        "Procurement Office": {
            "Raw Material Team": ["Sourcing Part", "PO Part"],
            "Supplier QA Team": [],
        },
        "Materials Office": {
            "Warehouse Team": ["Receiving Part", "Issuing Part"],
            "Inventory Team": [],
            "Chemical Team": [],
        },
    },
    "Battery Center": {
        "Electrode Office": {
            "Mixing Team": ["Slurry Part"],
            "Coating Team": [],
        },
        "Cell Assembly Office": None,
    },
}

SURNAMES = [
    "Kim", "Lee", "Park", "Choi", "Jung", "Kang", "Cho", "Yoon", "Jang", "Lim",
    "Han", "Oh", "Seo", "Shin", "Kwon", "Hwang", "Ahn", "Song", "Yoo", "Hong",
]
GIVEN = [
    "Junho", "Minjae", "Soyeon", "Daehyun", "Hana", "Jiwon", "Seojun", "Yuna",
    "Doyun", "Haeun", "Sion", "Nari", "Taeyang", "Bora", "Gunwoo", "Sujin",
    "Hyun", "Mina", "Jaewon", "Eunseo", "Woojin", "Jia", "Sanghyun", "Yerin",
]
TITLES = ["Manager", "Senior", "Associate", "Staff", "Lead"]



IND_MAB = "Antibody Therapeutics / 항체 의약품"
IND_SEMI = "Memory Semiconductor / 메모리 반도체"
IND_BATT = "EV Battery / 이차전지"


def _m(
    key: str,
    name: str,
    level: int,
    parent: str | None,
    *,
    industry: str,
    vis: str = "public",
    desc: str = "",
    flow: str | None = None,
    designated: tuple[str, str] | None = None,
    canvas_chain: list[str] | None = None,
) -> dict[str, Any]:
    """industry = catalog group only (not workflow level).

    canvas_chain: optional map keys for sequential Call Activity line on this map
    (overrides direct children). Used for demo big-boards e.g. Photo Coat→Expose→….
    """
    d: dict[str, Any] = {
        "key": key,
        "name": name,
        "level": level,
        "parent": parent,
        "industry": industry,
        "vis": vis,
        "desc": desc or f"{name} — industry demo map",
    }
    if flow:
        d["flow"] = flow
    if designated:
        d["designated"] = designated
    if canvas_chain:
        d["canvas_chain"] = canvas_chain
    return d


# ── MAP_TREE: 위상 정렬(부모 먼저). L1=도메인(산업군 아님) ────────────────
# 산업군은 description 태그 + Structure industries 섹션으로만 묶음 (고객 데모용).
# Memory Semiconductor = SK hynix-style full value chain L1–L5 (seed_semi_hynix).
MAP_TREE: list[dict[str, Any]] = [
# ════════ Antibody — L1 Domain … L4 ═══════════════════════════════════
    _m("mab-sales", "Sales / 영업", 1, None, industry=IND_MAB,
       desc="병원·도매 수주 및 핵심 고객 관리."),
    _m("mab-mfg", "Manufacturing / 생산", 1, None, industry=IND_MAB,
       desc="원료의약품(DS)·완제의약품(DP) 제조."),
    _m("mab-proc", "Procurement / 구매", 1, None, industry=IND_MAB,
       desc="배지·레진·필터 등 GMP 원부자재 조달."),
    _m("mab-plan", "Production Planning / 생산계획", 1, None, industry=IND_MAB,
       desc="수요·능력·캠페인 스케줄."),
    _m("mab-mat", "Materials / 자재", 1, None, industry=IND_MAB,
       desc="창고·로트·생산 출고(FEFO)."),
    _m("mab-order", "Order Management / 수주 관리", 2, "mab-sales", industry=IND_MAB),
    _m("mab-ka", "Key Account Mgmt / 핵심 고객 관리", 2, "mab-sales", industry=IND_MAB,
       vis="private"),
    _m("mab-q2c", "Quote-to-Contract / 견적~계약", 3, "mab-order", industry=IND_MAB,
       flow="quote_to_contract", designated=("CRM + e-Sign", "3–10 days")),
    _m("mab-quote", "Quote Preparation / 견적 작성", 4, "mab-q2c", industry=IND_MAB,
       flow="quote_prep"),
    _m("mab-contract", "Contract Execution / 계약 체결", 4, "mab-q2c", industry=IND_MAB,
       vis="private", flow="contract_exec"),
    _m("mab-account", "Account Planning / 계정 계획", 3, "mab-ka", industry=IND_MAB,
       vis="private", flow="account_plan"),
    _m("mab-up", "Upstream / 업스트림", 2, "mab-mfg", industry=IND_MAB),
    _m("mab-down", "Downstream / 다운스트림", 2, "mab-mfg", industry=IND_MAB),
    _m("mab-ff", "Fill-Finish / 충전·포장", 2, "mab-mfg", industry=IND_MAB, vis="private"),
    _m("mab-culture", "Cell Culture Batch / 세포배양 배치", 3, "mab-up", industry=IND_MAB,
       flow="cell_culture", designated=("MES + Bioreactor", "10–18 days")),
    _m("mab-seed", "Seed Train / 시드 트레인", 4, "mab-culture", industry=IND_MAB,
       flow="seed_train"),
    _m("mab-bioreactor", "Production Bioreactor / 본배양", 4, "mab-culture", industry=IND_MAB,
       flow="bioreactor"),
    _m("mab-purify", "Purification Batch / 정제 배치", 3, "mab-down", industry=IND_MAB,
       flow="purification", designated=("MES + Chromatography", "5–8 days")),
    _m("mab-prota", "Protein A Capture / Protein A 포획", 4, "mab-purify", industry=IND_MAB,
       flow="protein_a"),
    _m("mab-viral", "Viral Clearance / 바이러스 제거", 4, "mab-purify", industry=IND_MAB,
       vis="private", flow="viral_clearance"),
    _m("mab-fill", "Aseptic Filling / 무균 충전", 3, "mab-ff", industry=IND_MAB,
       vis="private", flow="aseptic_fill"),
    _m("mab-rm", "Raw Material Sourcing / 원료 소싱", 2, "mab-proc", industry=IND_MAB),
    _m("mab-sq", "Supplier Qualification / 공급사 적격성", 2, "mab-proc", industry=IND_MAB,
       vis="private"),
    _m("mab-p2r", "Purchase-to-Receipt / 발주~입고", 3, "mab-rm", industry=IND_MAB,
       flow="purchase_to_receipt", designated=("SAP MM", "1–4 weeks")),
    _m("mab-rfq", "RFQ & Quote Compare / 견적요청·비교", 4, "mab-p2r", industry=IND_MAB,
       flow="rfq_compare"),
    _m("mab-po", "PO & Receipt / 발주·입고", 4, "mab-p2r", industry=IND_MAB, flow="po_receipt"),
    _m("mab-qualify", "Vendor Qualification / 벤더 적격성", 3, "mab-sq", industry=IND_MAB,
       vis="private", flow="vendor_qualify"),
    _m("mab-dc", "Demand & Capacity / 수요·능력", 2, "mab-plan", industry=IND_MAB),
    _m("mab-mps", "MPS & Batch Schedule / 기준생산계획", 3, "mab-dc", industry=IND_MAB,
       flow="mps_schedule", designated=("SAP PP + APS", "monthly")),
    _m("mab-cap", "Capacity Check / 능력 점검", 4, "mab-mps", industry=IND_MAB,
       flow="capacity_check"),
    _m("mab-campaign", "Batch Campaign Plan / 캠페인 계획", 4, "mab-mps", industry=IND_MAB,
       vis="private", flow="campaign_plan"),
    _m("mab-wh", "Warehouse Ops / 창고 운영", 2, "mab-mat", industry=IND_MAB),
    _m("mab-inv", "Inventory Control / 재고 관리", 2, "mab-mat", industry=IND_MAB,
       vis="private"),
    _m("mab-issue", "Issue-to-Production / 생산 출고", 3, "mab-wh", industry=IND_MAB,
       flow="issue_to_prod", designated=("WMS + MES", "1 day")),
    _m("mab-lot", "Lot Allocation / 로트 할당", 4, "mab-issue", industry=IND_MAB,
       flow="lot_alloc"),
    _m("mab-stage", "Line-side Staging / 라인사이드 스테이징", 4, "mab-issue",
       industry=IND_MAB, flow="line_stage"),
    _m("mab-count", "Cycle Count & FEFO / 순환재고·FEFO", 3, "mab-inv", industry=IND_MAB,
       vis="private", flow="cycle_count"),

    # ════════ Memory Semiconductor (SK hynix-style L1–L5) ════════════════
    *build_semi_maps(_m),

# ════════ EV Battery — L1 Domain … L4 ═════════════════════════════════
    _m("batt-elec", "Electrode / 전극", 1, None, industry=IND_BATT,
       desc="양극·음극 슬러리·코팅·롤 프레스."),
    _m("batt-cell", "Cell Assembly / 셀 조립", 1, None, industry=IND_BATT,
       desc="스태킹·탭 용접·케이싱."),
    _m("batt-form", "Formation / 포메이션", 1, None, industry=IND_BATT,
       desc="초기 충방전·에이징."),
    _m("batt-mod", "Module & Pack / 모듈·팩", 1, None, industry=IND_BATT,
       desc="모듈 조립·팩 BMS 통합."),
    _m("batt-plan", "Production Planning / 생산계획", 1, None, industry=IND_BATT,
       desc="라인 스케줄·자재 소요."),
    _m("batt-mat", "Materials / 자재", 1, None, industry=IND_BATT,
       desc="활물질·전해액·분리막 물류."),
    _m("batt-coat-mod", "Coating Line / 코팅 라인", 2, "batt-elec", industry=IND_BATT),
    _m("batt-coat", "Cathode Coating / 양극 코팅", 3, "batt-coat-mod", industry=IND_BATT,
       flow="batt_coat", designated=("Coater + Dryer", "roll")),
    _m("batt-slurry", "Slurry Mixing / 슬러리 혼합", 4, "batt-coat", industry=IND_BATT,
       flow="batt_slurry"),
    _m("batt-coatdry", "Coat & Dry / 코팅·건조", 4, "batt-coat", industry=IND_BATT,
       flow="batt_coatdry"),
    _m("batt-assy-mod", "Cell Build / 셀 빌드", 2, "batt-cell", industry=IND_BATT),
    _m("batt-stack", "Stacking & Welding / 스태킹·용접", 3, "batt-assy-mod", industry=IND_BATT,
       flow="batt_stack"),
    _m("batt-stackstep", "Electrode Stack / 전극 적층", 4, "batt-stack", industry=IND_BATT,
       flow="batt_stackstep"),
    _m("batt-weld", "Tab Welding / 탭 용접", 4, "batt-stack", industry=IND_BATT, flow="batt_weld"),
    _m("batt-form-mod", "Formation Line / 포메이션 라인", 2, "batt-form", industry=IND_BATT),
    _m("batt-formrun", "Formation Cycle / 포메이션 사이클", 3, "batt-form-mod", industry=IND_BATT,
       flow="batt_formrun", designated=("Formation Rack", "days")),
    _m("batt-precharge", "Precharge / 초기충전", 4, "batt-formrun", industry=IND_BATT,
       flow="batt_precharge"),
    _m("batt-aging", "Aging / 에이징", 4, "batt-formrun", industry=IND_BATT, flow="batt_aging"),
    _m("batt-pack-mod", "Pack Line / 팩 라인", 2, "batt-mod", industry=IND_BATT),
    _m("batt-pack", "Module Pack Assembly / 모듈·팩 조립", 3, "batt-pack-mod", industry=IND_BATT,
       flow="batt_pack"),
    _m("batt-sched", "Scheduling / 스케줄링", 2, "batt-plan", industry=IND_BATT),
    _m("batt-mps", "Line Schedule / 라인 스케줄", 3, "batt-sched", industry=IND_BATT,
       flow="batt_mps"),
    _m("batt-wh", "Warehouse / 창고", 2, "batt-mat", industry=IND_BATT),
    _m("batt-issue", "Material Issue / 자재 출고", 3, "batt-wh", industry=IND_BATT,
       flow="batt_issue"),
]




def _build_leaves() -> list[dict]:
    leaves: list[dict] = []
    for center, depts in ORG_TREE.items():
        for dept, teams in depts.items():
            if teams is None:
                leaves.append({"l1": center, "l2": dept, "l3": None, "l4": None,
                               "department": dept})
                continue
            for team, parts in teams.items():
                if not parts:
                    leaves.append({"l1": center, "l2": dept, "l3": team, "l4": None,
                                   "department": team})
                    continue
                for part in parts:
                    leaves.append({"l1": center, "l2": dept, "l3": team, "l4": part,
                                   "department": part})
    return leaves


def _org_path(leaf: dict) -> str:
    return "/".join(v for v in (leaf["l1"], leaf["l2"], leaf["l3"], leaf["l4"]) if v)


def _edge(
    eid: str,
    version_id: int,
    src: str,
    tgt: str,
    *,
    label: str = "",
    source_handle: str | None = None,
    target_handle: str | None = None,
    source_side: str = "right",
    target_side: str = "left",
) -> Edge:
    return Edge(
        id=eid, version_id=version_id,
        source_node_id=src, target_node_id=tgt,
        label=label, source_side=source_side, target_side=target_side,
        source_handle=source_handle, target_handle=target_handle,
    )


def _chain(
    version_id: int,
    prefix: str,
    titles: list[str],
    *,
    start_y: float = 200.0,
    x0: float = 80.0,
    gap: float = 220.0,
) -> list:
    items: list = []
    start_id = f"{prefix}-s"
    items.append(Node(
        id=start_id, version_id=version_id, title="Start", node_type="start",
        pos_x=x0, pos_y=start_y, sort_order=0,
    ))
    prev = start_id
    for i, title in enumerate(titles):
        nid = f"{prefix}-n{i}"
        items.append(Node(
            id=nid, version_id=version_id, title=title, node_type="process",
            pos_x=x0 + gap * (i + 1), pos_y=start_y, sort_order=i + 1,
            duration=f"{RNG.randint(1, 8)}h",
        ))
        items.append(_edge(f"{prefix}-e{i}", version_id, prev, nid))
        prev = nid
    end_id = f"{prefix}-e"
    items.append(Node(
        id=end_id, version_id=version_id, title="End", node_type="end",
        pos_x=x0 + gap * (len(titles) + 1), pos_y=start_y,
        sort_order=len(titles) + 1, is_primary_end=True,
    ))
    items.append(_edge(f"{prefix}-ee", version_id, prev, end_id))
    return items


def _decision_flow(
    version_id: int,
    prefix: str,
    before: list[str],
    decision: str,
    yes_path: list[str],
    no_path: list[str],
    after: list[str],
) -> list:
    items: list = []
    x, y = 80.0, 240.0
    gap = 200.0
    order = 0

    def add_node(nid: str, title: str, ntype: str, px: float, py: float) -> Node:
        nonlocal order
        n = Node(
            id=nid, version_id=version_id, title=title, node_type=ntype,
            pos_x=px, pos_y=py, sort_order=order,
        )
        order += 1
        items.append(n)
        return n

    sid = f"{prefix}-s"
    add_node(sid, "Start", "start", x, y)
    prev = sid
    x += gap
    for i, t in enumerate(before):
        nid = f"{prefix}-b{i}"
        add_node(nid, t, "process", x, y)
        items.append(_edge(f"{prefix}-eb{i}", version_id, prev, nid))
        prev = nid
        x += gap

    did = f"{prefix}-d"
    add_node(did, decision, "decision", x, y)
    items.append(_edge(f"{prefix}-ed", version_id, prev, did))
    yes_x, no_x = x + gap, x + gap
    yes_y, no_y = y - 120, y + 120

    yes_prev = did
    for i, t in enumerate(yes_path):
        nid = f"{prefix}-y{i}"
        add_node(nid, t, "process", yes_x + gap * i, yes_y)
        items.append(_edge(
            f"{prefix}-ey{i}", version_id, yes_prev, nid,
            label="Yes" if i == 0 else "",
        ))
        yes_prev = nid
    no_prev = did
    for i, t in enumerate(no_path):
        nid = f"{prefix}-n{i}"
        add_node(nid, t, "process", no_x + gap * i, no_y)
        items.append(_edge(
            f"{prefix}-en{i}", version_id, no_prev, nid,
            label="No" if i == 0 else "",
        ))
        no_prev = nid

    merge_x = x + gap * (1 + max(len(yes_path), len(no_path), 1))
    after_prev_ids = [yes_prev, no_prev]
    if after:
        aid = f"{prefix}-a0"
        add_node(aid, after[0], "process", merge_x, y)
        for j, src in enumerate(after_prev_ids):
            items.append(_edge(f"{prefix}-em{j}", version_id, src, aid))
        prev = aid
        for i, t in enumerate(after[1:], start=1):
            nid = f"{prefix}-a{i}"
            add_node(nid, t, "process", merge_x + gap * i, y)
            items.append(_edge(f"{prefix}-ea{i}", version_id, prev, nid))
            prev = nid
        end_x = merge_x + gap * len(after)
        eid = f"{prefix}-e"
        end_node = add_node(eid, "End", "end", end_x, y)
        end_node.is_primary_end = True
        items.append(_edge(f"{prefix}-ee", version_id, prev, eid))
    else:
        eid = f"{prefix}-e"
        end_node = add_node(eid, "End", "end", merge_x, y)
        end_node.is_primary_end = True
        for j, src in enumerate(after_prev_ids):
            items.append(_edge(f"{prefix}-ee{j}", version_id, src, eid))
    return items


# 도메인별 상세 흐름 키 → 스텝 시퀀스
_FLOW_STEPS: dict[str, list[str]] = {
    "quote_to_contract": [
        "Receive RFQ", "Prepare Quote", "Discount Approval", "Send Proposal",
        "Negotiate Terms", "Execute Contract", "Book Order",
    ],
    "contract_exec": [
        "Legal Review", "Redline Cycle", "e-Sign", "Archive Contract", "ERP Order Entry",
    ],
    "account_plan": [
        "Pull Sales History", "Forecast Demand", "Set Account Goals",
        "Tender Calendar", "Quarterly Review",
    ],
    "cell_culture": [
        "Batch Record Issue", "Vial Thaw", "Seed Expansion",
        "Production Inoculation", "Fed-Batch Control", "Harvest Criteria Met",
        "Transfer to Downstream",
    ],
    "seed_train": [
        "Thaw Working Cell Bank", "Shake Flask Expansion", "N-2 Seed Bioreactor",
        "N-1 Seed Bioreactor", "In-Process QC", "Release to Production",
    ],
    "purification": [
        "Harvest Clarification", "Protein A Capture", "Low-pH Viral Inactivation",
        "Cation Exchange", "Anion Exchange", "UF/DF", "DS Bulk Fill",
    ],
    "protein_a": [
        "Equilibrate Column", "Load Clarified Harvest", "Wash Steps",
        "Elute Product", "Neutralize Pool", "Regenerate & Store",
    ],
    "viral_clearance": [
        "Adjust to Low pH", "Hold Timer", "pH Neutralize",
        "Pre-filter", "Viral Filter", "Integrity Test",
    ],
    "purchase_to_receipt": [
        "Create PR", "Source & RFQ", "Select Vendor", "Release PO",
        "Receive ASN", "Goods Receipt", "IQC Sample", "Post to Inventory",
    ],
    "rfq_compare": [
        "Define Specs", "Issue RFQ", "Collect Quotes", "TCO Compare",
        "Recommend Vendor", "Buyer Approval",
    ],
    "vendor_qualify": [
        "Request Documents", "Paper Audit", "Risk Score",
        "On-site Audit", "Quality Agreement", "Add to AVL",
    ],
    "mps_schedule": [
        "Import Sales Forecast", "Netting vs Inventory", "Rough-Cut Capacity",
        "Build MPS", "Sequence Campaigns", "Publish Schedule", "Notify Shops",
    ],
    "campaign_plan": [
        "Define Campaign Lots", "Plan Changeover", "CIP/SIP Windows",
        "Material Readiness", "Issue Campaign Order",
    ],
    "issue_to_prod": [
        "Receive Issue Request", "BOM Explosion", "Lot Allocation",
        "Pick & Stage", "Line Handoff", "MES Consume",
    ],
    "line_stage": [
        "Kit Materials", "Cold-chain Check", "Deliver to Suite",
        "Operator Verify", "MES Material Consume",
    ],
    "cycle_count": [
        "Select ABC Scope", "Count Physical", "Enter Variance",
        "Investigate Diff", "Adjust Inventory", "Re-slot FEFO",
    ],
    # Semiconductor
    "semi_arf": [
        "Lot Arrive Track", "Recipe Select", "Coat-Expose-Develop",
        "CD Measure", "Overlay Check", "Pass to Etch",
    ],
    "semi_coat": [
        "HMDS Prime", "PR Dispense", "Spin Coat", "Soft Bake", "Edge Bead Remove",
    ],
    "semi_expose": [
        "Load Reticle", "Wafer Align", "Dose & Focus", "Expose Field", "Unload",
    ],
    "semi_develop": [
        "PEB", "Develop Dispense", "Rinse", "Hard Bake", "Inspect",
    ],
    "semi_cd": [
        "Load CD SEM", "Measure Critical Dimension", "SPC Chart", "Disposition",
    ],
    "semi_overlay": [
        "Select Layer Pair", "Measure Overlay", "Model Residuals",
        "Feedback to Scanner", "Reticle Status Check",
    ],
    "semi_ovl_meas": [
        "Align Metrology Tool", "Sample Sites", "Compute Overlay", "Send APC",
    ],
    "semi_reticle": [
        "Reticle Incoming", "Pellicle Inspect", "Defect Scan", "Release to Stocker",
    ],
    "semi_de_etch": [
        "Chamber Season", "Load Recipe", "Plasma Etch", "Endpoint", "Post Clean",
    ],
    "semi_etch_recipe": [
        "DOE Plan", "Pilot Wafers", "CD/Profile Check", "Freeze Recipe",
    ],
    "semi_plasma": [
        "Pump Down", "Strike Plasma", "Main Etch", "Overetch", "Vent & Unload",
    ],
    "semi_cond_etch": [
        "Ash PR", "Metal/Poly Etch", "Endpoint Detect", "Residue Clean",
    ],
    "semi_epd": [
        "Set Endpoint Channel", "Monitor Trace", "Trigger Stop", "Log Result",
    ],
    "semi_ash": [
        "O2 Ash", "Wet Residue Strip", "Particle Check", "Release Lot",
    ],
    "semi_well": [
        "Pad Ox", "Well Photo", "Implant", "Anneal", "Gate Ox",
    ],
    "semi_ox": [
        "RCA Clean", "Furnace Load", "Dry/Wet Ox", "Ellipsometry",
    ],
    "semi_implant": [
        "Photo Mask", "Implant Dose", "Resist Strip", "RTA Anneal",
    ],
    "semi_dep": [
        "Pre-clean", "PVD/CVD Deposit", "Thickness Measure", "Pattern Ready",
    ],
    "semi_pvd": [
        "Chamber Check", "Target Condition", "Deposit", "Cool Down",
    ],
    "semi_film_met": [
        "Select Sites", "Thickness/Rs", "Uniformity Map", "SPC",
    ],
    "semi_planar": [
        "Pad Condition", "Polish", "Endpoint", "Post-CMP Clean", "Thickness",
    ],
    "semi_polish": [
        "Slurry Select", "Downforce Profile", "Polish Time", "Buff",
    ],
    "semi_postcmp": [
        "Brush Clean", "Megasonic", "Dry", "Defect Scan",
    ],
    "semi_preclean": [
        "SC1", "SC2", "DHF Optional", "Dryer", "Particle Count",
    ],
    "semi_sc": [
        "Bath Prepare", "SC1 Immerse", "Rinse", "SC2 Immerse", "Rinse",
    ],
    "semi_dryer": [
        "Marangoni Dry", "N2 Purge", "Unload FOUP",
    ],
    "semi_sort": [
        "Probe Card Mount", "Wafer Load", "Touchdown", "Test Program", "Bin Map",
    ],
    "semi_pcard": [
        "Card Inspect", "Mount to Prober", "Planarity", "Clean Tips",
    ],
    "semi_param": [
        "Run Parametric", "Limit Check", "Flag Outliers", "Upload Results",
    ],
    "semi_pkg": [
        "Die Attach", "Wire Bond", "Mold", "Mark", "Singulate",
    ],
    "semi_da": [
        "Wafer Mount", "Die Pick", "Epoxy/Attach", "Cure",
    ],
    "semi_wb": [
        "Bond Program", "1st Bond", "Loop", "2nd Bond", "Pull Test Sample",
    ],
    "semi_mold": [
        "Pre-heat", "Transfer Mold", "PMC", "Deflash",
    ],
    "semi_pkgtest": [
        "Burn-in", "Final Test", "Visual", "Pack & Ship",
    ],
    "semi_burnin": [
        "Load Oven", "Bias Stress", "Unload", "Retest Gate",
    ],
    "semi_felect": [
        "Socket Test", "Speed Bin", "Fail Analysis Hold", "Tape & Reel",
    ],
    "semi_dispatch": [
        "WIP Snapshot", "Constraint Check", "Rank Lots", "Dispatch", "Move Confirm",
    ],
    "semi_lotdisp": [
        "Select Tool", "Check Qualification", "Reserve Chamber", "Track Out",
    ],
    "semi_hotlot": [
        "Hot Lot Flag", "Priority Queue", "Expedite Move", "Notify Owner",
    ],
    "semi_chem": [
        "Kanban Signal", "Dispense Chemical", "FOUP Transfer", "Stocker Put",
    ],
    "semi_dispense": [
        "Drum Change", "Filter Check", "Dispense to Tool", "Log Lot",
    ],
    "semi_foup": [
        "AMHS Request", "OHB Transfer", "Load Port", "ID Verify",
    ],
    # Battery
    "batt_coat": [
        "Slurry Ready", "Coat Die Head", "Dry Oven", "Calender", "Slit",
    ],
    "batt_slurry": [
        "Weigh Active Material", "Binder Mix", "Disperse", "Viscosity Check",
    ],
    "batt_coatdry": [
        "Web Thread", "Coat", "Multi-zone Dry", "Thickness Gauge",
    ],
    "batt_stack": [
        "Electrode Cut", "Stack/Wind", "Tab Weld", "Case Insert", "Electrolyte Fill",
    ],
    "batt_stackstep": [
        "Align Separator", "Z-fold Stack", "Count Layers", "Press",
    ],
    "batt_weld": [
        "Tab Position", "Ultrasonic/Laser Weld", "Pull Test", "Insulate",
    ],
    "batt_formrun": [
        "Precharge", "Rest", "Main Formation", "Aging", "OCV Screen",
    ],
    "batt_precharge": [
        "Connect Rack", "CC-CV Precharge", "Gas Check", "Disconnect",
    ],
    "batt_aging": [
        "Set Temp", "Hold Days", "IR/OCV Measure", "Grade Cell",
    ],
    "batt_pack": [
        "Module Stack", "Busbar", "BMS Wire", "EOL Test", "Pack Ship",
    ],
    "batt_mps": [
        "Demand Plan", "Line Capacity", "Sequence SKUs", "Publish Schedule",
    ],
    "batt_issue": [
        "BOM Pick", "Lot Allocate", "Issue to Line", "MES Consume",
    ],
}
_FLOW_STEPS.update(SEMI_FLOW_STEPS)


_DECISION_FLOWS: dict[str, dict[str, Any]] = {
    "quote_prep": {
        "before": ["Load Price List", "Draft Quote Lines"],
        "decision": "Discount > Policy?",
        "yes_path": ["Manager Approval", "Apply Discount"],
        "no_path": ["Apply Standard Price"],
        "after": ["Generate Quote PDF", "Send to Customer"],
    },
    "bioreactor": {
        "before": ["Media Fill & SIP", "Inoculate Production BRX", "Start Fed-Batch"],
        "decision": "Viable Cell Density OK?",
        "yes_path": ["Continue to Day N", "Induce / Feed Final"],
        "no_path": ["Deviation Report", "CAPA Review"],
        "after": ["Confirm Harvest Window", "Cool & Transfer"],
    },
    "aseptic_fill": {
        "before": ["Thaw / Formulate DS", "Sterile Filter", "Line Clearance"],
        "decision": "Environmental Monitoring OK?",
        "yes_path": ["Aseptic Fill", "Stopper & Cap"],
        "no_path": ["Hold Batch", "QA Disposition"],
        "after": ["Visual Inspection", "Secondary Pack", "Quarantine Release"],
    },
    "po_receipt": {
        "before": ["PO Release", "Track Shipment", "Dock Receipt"],
        "decision": "COA / Spec Match?",
        "yes_path": ["IQC Sample Pull", "Post GR"],
        "no_path": ["Quarantine Hold", "Supplier NCR"],
        "after": ["Label & Put-away"],
    },
    "capacity_check": {
        "before": ["Load Suite Calendar", "Check Media Lead Time", "Check QC TAT"],
        "decision": "Capacity Sufficient?",
        "yes_path": ["Confirm Slot", "Lock Resources"],
        "no_path": ["Re-sequence Campaigns", "Escalate Shortage"],
        "after": ["Update APS"],
    },
    "lot_alloc": {
        "before": ["Query Available Lots", "Apply FEFO Rank"],
        "decision": "Status Released?",
        "yes_path": ["Allocate Qty", "Print Pick List"],
        "no_path": ["Skip Lot", "Next FEFO Lot"],
        "after": ["Confirm Allocation"],
    },
}


def _flow_for(version_id: int, prefix: str, flow_key: str | None) -> list:
    if flow_key and flow_key in _DECISION_FLOWS:
        d = _DECISION_FLOWS[flow_key]
        return _decision_flow(
            version_id, prefix,
            d["before"], d["decision"], d["yes_path"], d["no_path"], d["after"],
        )
    if flow_key and flow_key in _FLOW_STEPS:
        return _chain(version_id, prefix, _FLOW_STEPS[flow_key])
    return _chain(
        version_id, prefix,
        ["Receive Request", "Execute Work", "Review Result", "Close"],
    )


def _sequential_subprocess_graph(
    version_id: int,
    prefix: str,
    steps: list[tuple[int, str]],
    *,
    y: float = 220.0,
    x0: float = 80.0,
    gap: float = 260.0,
) -> list:
    """Start → subprocess₁ → … → subprocessₙ → End (한 줄 흐름 / 더블클릭 드릴).

    subprocess 핸들: 입력=in, 출력=__primary__ (process-node SubprocessHandles).
    """
    if not steps:
        return _chain(version_id, prefix, ["Review Scope", "Align Owners", "Publish Plan"])

    items: list = []
    start_id = f"{prefix}-s"
    items.append(Node(
        id=start_id, version_id=version_id, title="Start", node_type="start",
        pos_x=x0, pos_y=y, sort_order=0,
    ))
    prev = start_id
    for i, (mid, title) in enumerate(steps):
        nid = f"{prefix}-sp{i}"
        items.append(Node(
            id=nid, version_id=version_id, title=title, node_type="subprocess",
            linked_map_id=mid, follow_latest=True,
            pos_x=x0 + gap * (i + 1), pos_y=y, sort_order=i + 1,
        ))
        # Start/prev → subprocess (target = SP_IN); 이전 subprocess면 source = SP_OUT
        items.append(_edge(
            f"{prefix}-e{i}", version_id, prev, nid,
            source_handle=SP_OUT if i > 0 else None,
            target_handle=SP_IN,
        ))
        prev = nid

    end_id = f"{prefix}-e"
    items.append(Node(
        id=end_id, version_id=version_id, title="End", node_type="end",
        pos_x=x0 + gap * (len(steps) + 1), pos_y=y,
        sort_order=len(steps) + 1, is_primary_end=True,
    ))
    items.append(_edge(
        f"{prefix}-ee", version_id, prev, end_id,
        source_handle=SP_OUT,
    ))
    return items


def _overview_graph(
    version_id: int,
    prefix: str,
    child_maps: list[tuple[int, str]],
) -> list:
    """L1/L2 개요 — 자식 맵을 순차 Call Activity 한 줄로 (큰 판 E2E)."""
    return _sequential_subprocess_graph(version_id, prefix, child_maps)


def _l3_with_subprocesses(
    version_id: int,
    prefix: str,
    flow_key: str | None,
    child_maps: list[tuple[int, str]],
) -> list:
    """L3/L4: 하위가 있으면 순차 subprocess 큰 판; 없으면 flow_key 상세 스텝."""
    if child_maps:
        return _sequential_subprocess_graph(version_id, prefix, child_maps)
    return _flow_for(version_id, prefix, flow_key)


def _publish_events(
    session: AsyncSession, vid: int, owner: str, approvers: list[str], created,
    reject: bool = False, withdraw: bool = False,
) -> None:
    t = created
    session.add(VersionEvent(version_id=vid, event_type="created", actor=owner, created_at=t))
    t = t + timedelta(hours=1)
    session.add(VersionEvent(version_id=vid, event_type="submitted", actor=owner, created_at=t))
    if reject:
        t = t + timedelta(hours=1)
        session.add(VersionEvent(version_id=vid, event_type="rejected",
                                 actor=approvers[0], note="minor fix requested", created_at=t))
        t = t + timedelta(hours=2)
        session.add(VersionEvent(version_id=vid, event_type="submitted", actor=owner, created_at=t))
    if withdraw:
        t = t + timedelta(hours=1)
        session.add(VersionEvent(version_id=vid, event_type="withdrawn", actor=owner, created_at=t))
        t = t + timedelta(hours=2)
        session.add(VersionEvent(version_id=vid, event_type="submitted", actor=owner, created_at=t))
    for aid in approvers:
        session.add(VersionApproval(version_id=vid, approver=aid))
        t = t + timedelta(minutes=30)
        session.add(VersionEvent(version_id=vid, event_type="approved", actor=aid, created_at=t))
    t = t + timedelta(hours=1)
    session.add(VersionEvent(version_id=vid, event_type="published", actor=owner, created_at=t))


async def _seed_employees(session: AsyncSession, total: int = 400) -> list[dict]:
    leaves = _build_leaves()
    used_ids: set[str] = set()
    people: list[dict] = []

    def _login(given: str, surname: str) -> str:
        base = f"{given.lower()}.{surname.lower()}"
        lid, n = base, 1
        while lid in used_ids:
            n += 1
            lid = f"{base}{n}"
        used_ids.add(lid)
        return lid

    admin_leaf = {"l1": "Management Center", "l2": "IT Office", "l3": "System Team",
                  "l4": None, "department": "System Team"}
    session.add(Employee(
        login_id="admin.sys", name="System Admin", title="Manager", source="local",
        role="admin", org_l1=admin_leaf["l1"], org_l2=admin_leaf["l2"],
        org_l3=admin_leaf["l3"], org_l4=None, department=admin_leaf["department"],
        active=True, email="admin.sys@corp",
    ))
    used_ids.add("admin.sys")
    people.append({"login_id": "admin.sys", "name": "System Admin", "role": "admin",
                   "leaf": admin_leaf, "path": _org_path(admin_leaf)})

    for i in range(total):
        leaf = leaves[i % len(leaves)]
        given, surname = RNG.choice(GIVEN), RNG.choice(SURNAMES)
        lid = _login(given, surname)
        name = f"{given} {surname}"
        session.add(Employee(
            login_id=lid, name=name, title=RNG.choice(TITLES), source="local",
            role="user", org_l1=leaf["l1"], org_l2=leaf["l2"], org_l3=leaf["l3"],
            org_l4=leaf["l4"], department=leaf["department"], active=True, email=f"{lid}@corp",
        ))
        people.append({"login_id": lid, "name": name, "role": "user", "leaf": leaf,
                       "path": _org_path(leaf)})
    await session.flush()
    return people


async def _seed_groups(session: AsyncSession, people: list[dict]) -> dict:
    users = [p for p in people if p["role"] == "user"]
    part_paths = sorted({p["path"] for p in people if p["leaf"]["l4"]})
    specs: list[tuple[str, str, list[tuple[str, str]]]] = []
    for i in range(2):
        specs.append(("user", f"User Group {i + 1}",
                      [("user", p["login_id"]) for p in RNG.sample(users, 5)]))
    for i in range(2):
        specs.append(("part", f"Part Group {i + 1}",
                      [("department", pp) for pp in RNG.sample(part_paths, min(3, len(part_paths)))]))
    for i in range(2):
        members = ([("user", p["login_id"]) for p in RNG.sample(users, 3)]
                   + [("department", pp) for pp in RNG.sample(part_paths, min(2, len(part_paths)))])
        specs.append(("mixed", f"Mixed Group {i + 1}", members))

    result: dict = {"user": [], "part": [], "mixed": []}
    for kind, name, members in specs:
        g = UserGroup(name=name, description=f"Demo — {name}", status="active",
                      created_by="admin.sys")
        session.add(g)
        await session.flush()
        result[kind].append(g.id)
        for mtype, mid in members:
            session.add(UserGroupMember(group_id=g.id, member_type=mtype, member_id=mid))
    await session.flush()
    return result


async def _seed_versions(
    session: AsyncSession,
    map_id: int,
    owner: str,
    approvers: list[str],
    base,
    map_idx: int,
    *,
    graph_builder,
    level: int = 3,
) -> None:
    # L5 태스크 맵은 게시 1 + draft 1만 (대량 시드 성능). L1–L4는 풀 이력.
    light = level >= 5
    if light:
        created = base - timedelta(days=7)
        v = MapVersion(map_id=map_id, label="Release 1", status=workflow.PUBLISHED,
                       version_number=1, submitted_by=owner, created_at=created)
        session.add(v)
        await session.flush()
        session.add_all(graph_builder(v.id, f"m{map_id}v1"))
        _publish_events(session, v.id, owner, approvers, created)
        created = base - timedelta(days=1)
        v = MapVersion(map_id=map_id, label="Release 2", status=workflow.DRAFT,
                       version_number=None, checked_out_by=owner, checked_out_at=created,
                       created_at=created)
        session.add(v)
        await session.flush()
        session.add_all(graph_builder(v.id, f"m{map_id}v2"))
        session.add(VersionEvent(version_id=v.id, event_type="created", actor=owner, created_at=created))
        return

    for n in range(1, 6):
        status = workflow.PUBLISHED if n == 5 else workflow.EXPIRED
        created = base - timedelta(days=(6 - n) * 7)
        v = MapVersion(map_id=map_id, label=f"Release {n}", status=status,
                       version_number=n, submitted_by=owner, created_at=created)
        session.add(v)
        await session.flush()
        if n == 5:
            session.add_all(graph_builder(v.id, f"m{map_id}v{n}"))
        _publish_events(session, v.id, owner, approvers, created,
                        reject=(map_idx % 4 == 1 and n == 3),
                        withdraw=(map_idx % 4 == 2 and n == 4))

    created = base - timedelta(days=1)
    if map_idx % 5 == 3:
        v = MapVersion(map_id=map_id, label="Release 6", status=workflow.REJECTED,
                       version_number=None, submitted_by=owner,
                       reject_reason="Needs revision before release", created_at=created)
        session.add(v)
        await session.flush()
        session.add_all(graph_builder(v.id, f"m{map_id}v6"))
        session.add(VersionEvent(version_id=v.id, event_type="created", actor=owner, created_at=created))
        session.add(VersionEvent(version_id=v.id, event_type="submitted", actor=owner,
                                 created_at=created + timedelta(hours=1)))
        session.add(VersionEvent(version_id=v.id, event_type="rejected", actor=approvers[0],
                                 note="Needs revision before release",
                                 created_at=created + timedelta(hours=2)))
    else:
        v = MapVersion(map_id=map_id, label="Release 6", status=workflow.DRAFT,
                       version_number=None, checked_out_by=owner, checked_out_at=created,
                       created_at=created)
        session.add(v)
        await session.flush()
        session.add_all(graph_builder(v.id, f"m{map_id}v6"))
        session.add(VersionEvent(version_id=v.id, event_type="created", actor=owner, created_at=created))


async def _seed_maps(session: AsyncSession, people: list[dict], groups: dict) -> list[int]:
    users = [p for p in people if p["role"] == "user"]
    part_paths = sorted({p["path"] for p in people if p["leaf"]["l4"]})
    all_groups = groups["user"] + groups["part"] + groups["mixed"]
    base = now_kst()

    key_to_id: dict[str, int] = {}
    key_to_spec: dict[str, dict] = {s["key"]: s for s in MAP_TREE}
    children_of: dict[str, list[str]] = {}
    for spec in MAP_TREE:
        p = spec["parent"]
        if p:
            children_of.setdefault(p, []).append(spec["key"])

    map_ids: list[int] = []
    for idx, spec in enumerate(MAP_TREE):
        owner = users[idx % len(users)]
        parent_id = key_to_id.get(spec["parent"]) if spec["parent"] else None
        body_desc = spec.get("desc", f"{spec['name']} — industry demo")
        industry = spec.get("industry")
        full_desc = f"industry:{industry}\n{body_desc}" if industry else body_desc
        m = ProcessMap(
            name=spec["name"],
            description=full_desc,
            created_by=owner["login_id"],
            owner_id=owner["login_id"],
            visibility=spec["vis"],
            workflow_level=spec["level"],
            parent_map_id=parent_id,
        )
        if idx % 3 != 0:
            m.owning_department = owner["path"]
        if "designated" in spec:
            system, duration = spec["designated"]
            m.sp_designated_at = base
            m.sp_department = owner["leaf"]["department"]
            m.sp_system = system
            m.sp_duration = duration
            m.sp_changed_by = owner["login_id"]
            m.sp_changed_at = base
        session.add(m)
        await session.flush()
        key_to_id[spec["key"]] = m.id
        map_ids.append(m.id)

        others = [u for u in users if u["login_id"] != owner["login_id"]]
        perms: list[tuple[str, str, str]] = [("user", owner["login_id"], "owner")]
        for p in RNG.sample(others, min(2, len(others))):
            perms.append(("user", p["login_id"], "editor"))
        for p in RNG.sample(others, min(3, len(others))):
            perms.append(("user", p["login_id"], "viewer"))
        if part_paths:
            perms.append(("department", RNG.choice(part_paths), RNG.choice(["editor", "viewer"])))
        if all_groups:
            perms.append(("group", str(RNG.choice(all_groups)), RNG.choice(["editor", "viewer"])))
        for ptype, pid, role in perms:
            session.add(MapPermission(map_id=m.id, principal_type=ptype, principal_id=pid,
                                      role=role, granted_by=owner["login_id"]))

        approver_ids = [p["login_id"] for p in RNG.sample(users, RNG.randint(1, 3))]
        for aid in approver_ids:
            session.add(MapApprover(map_id=m.id, user_id=aid, assigned_by=owner["login_id"]))

        spec["_owner"] = owner["login_id"]
        spec["_approvers"] = approver_ids
        spec["_idx"] = idx

    for spec in MAP_TREE:
        mid = key_to_id[spec["key"]]
        child_keys = children_of.get(spec["key"], [])
        # canvas_chain 우선(데모 큰 판) — 없으면 트리 직계 자식 순서
        chain_keys: list[str] = spec.get("canvas_chain") or child_keys
        chain_maps = [
            (key_to_id[ck], key_to_spec[ck]["name"])
            for ck in chain_keys
            if ck in key_to_id
        ]
        child_maps = [(key_to_id[ck], key_to_spec[ck]["name"]) for ck in child_keys]
        # 체인이 비면 직계 자식, 그것도 없으면 상세 flow
        steps = chain_maps or child_maps
        level = spec["level"]
        flow_key = spec.get("flow")

        def make_builder(
            lvl: int = level,
            fk: str | None = flow_key,
            seq: list[tuple[int, str]] = steps,
        ):
            def builder(vid: int, prefix: str) -> list:
                if lvl <= 2:
                    return _overview_graph(vid, prefix, seq)
                if lvl in (3, 4):
                    return _l3_with_subprocesses(vid, prefix, fk, seq)
                return _flow_for(vid, prefix, fk)
            return builder

        await _seed_versions(
            session, mid, spec["_owner"], spec["_approvers"], base, spec["_idx"],
            graph_builder=make_builder(), level=level,
        )

    # 지정/미지정 subprocess 병치 데모 — Quote-to-Contract draft
    consumer_key, designated_key, undesignated_key = "mab-q2c", "mab-culture", "mab-qualify"
    if all(k in key_to_id for k in (consumer_key, designated_key, undesignated_key)):
        consumer_map = key_to_id[consumer_key]
        draft_vid = await session.scalar(
            select(MapVersion.id).where(
                MapVersion.map_id == consumer_map, MapVersion.label == "Release 6"
            )
        )
        if draft_vid is not None:
            session.add_all([
                Node(id=f"m{consumer_map}-sp-designated", version_id=draft_vid,
                     title=key_to_spec[designated_key]["name"], node_type="subprocess",
                     linked_map_id=key_to_id[designated_key], follow_latest=True,
                     pos_x=80.0, pos_y=560.0, sort_order=200),
                Node(id=f"m{consumer_map}-sp-undesignated", version_id=draft_vid,
                     title=key_to_spec[undesignated_key]["name"], node_type="subprocess",
                     linked_map_id=key_to_id[undesignated_key], follow_latest=True,
                     pos_x=380.0, pos_y=560.0, sort_order=201),
            ])
    await session.flush()
    return map_ids


async def seed_org_demo(session: AsyncSession) -> dict:
    people = await _seed_employees(session)
    groups = await _seed_groups(session, people)
    map_ids = await _seed_maps(session, people, groups)
    await session.commit()
    return {
        "employees": len(people),
        "groups": sum(len(v) for v in groups.values()),
        "maps": len(map_ids),
        "industries": 3,  # catalog groups (not workflow L1)
    }
