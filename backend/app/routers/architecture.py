"""Architecture ontology APIs — O1 gaps, O2 concepts, O3 relations (design 2026-07-11)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.architecture import (
    RELATION_TYPES,
    compute_gaps,
    relation_endpoints_ok,
)
from app.auth import get_current_user
from app.db import get_session
from app.models import ArchitectureRelation, Concept, MapVersion, Node, ProcessMap
from app.permissions.access import get_effective_role
from app.permissions.deps import require_map_role
from app.permissions.logic import is_sysadmin

router = APIRouter(prefix="/api", tags=["architecture"], dependencies=[Depends(get_current_user)])


# ── Schemas (local; also mirrored in app.schemas if needed) ──────────────


class GapIssueOut(BaseModel):
    kind: str
    severity: str
    map_id: int | None = None
    map_name: str = ""
    related_map_id: int | None = None
    related_map_name: str | None = None
    message: str = ""


class StructureGapsOut(BaseModel):
    issues: list[GapIssueOut]
    map_count: int
    issue_count: int


class ConceptCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    aliases: list[str] = Field(default_factory=list)
    workflow_level: int | None = Field(default=None, ge=1, le=5)
    description: str = Field(default="", max_length=2000)


class ConceptUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    aliases: list[str] | None = None
    workflow_level: int | None = Field(default=None, ge=1, le=5)
    description: str | None = Field(default=None, max_length=2000)
    status: str | None = Field(default=None, max_length=20)


class ConceptOut(BaseModel):
    id: int
    name: str
    aliases: list
    workflow_level: int | None
    description: str
    created_by: str
    status: str
    map_count: int = 0


class MapConceptIn(BaseModel):
    concept_id: int | None = None


class CallerOut(BaseModel):
    map_id: int
    map_name: str
    version_id: int
    node_id: str
    node_title: str


class RelationCreate(BaseModel):
    relation_type: str = Field(max_length=30)
    source_map_id: int | None = None
    target_map_id: int | None = None
    source_concept_id: int | None = None
    target_concept_id: int | None = None
    note: str = Field(default="", max_length=500)


class RelationOut(BaseModel):
    id: int
    relation_type: str
    source_map_id: int | None
    target_map_id: int | None
    source_concept_id: int | None
    target_concept_id: int | None
    note: str
    created_by: str
    derived: bool = False


class MapArchitectureOut(BaseModel):
    map_id: int
    callers: list[CallerOut]
    derived_contains_children: list[int]
    derived_calls: list[int]
    explicit: list[RelationOut]


async def _visible_maps(session: AsyncSession, user: str) -> list[ProcessMap]:
    from app.routers.maps import list_maps

    return list(await list_maps(session=session, user=user))


# ── O1 Gaps ──────────────────────────────────────────────────────────────


@router.get("/structure/gaps", response_model=StructureGapsOut)
async def structure_gaps(
    session: AsyncSession = Depends(get_session),
    user: str = Depends(get_current_user),
) -> StructureGapsOut:
    visible = await _visible_maps(session, user)
    ids = [m.id for m in visible]
    if not ids:
        return StructureGapsOut(issues=[], map_count=0, issue_count=0)
    versions = list(
        (
            await session.scalars(select(MapVersion).where(MapVersion.map_id.in_(ids)))
        ).all()
    )
    vids = [v.id for v in versions]
    nodes: list[Node] = []
    if vids:
        nodes = list(
            (await session.scalars(select(Node).where(Node.version_id.in_(vids)))).all()
        )
    concepts = list((await session.scalars(select(Concept))).all())
    raw = compute_gaps(visible, versions=versions, nodes=nodes, concepts=concepts)
    issues = [
        GapIssueOut(
            kind=i.kind,
            severity=i.severity,
            map_id=i.map_id,
            map_name=i.map_name,
            related_map_id=i.related_map_id,
            related_map_name=i.related_map_name,
            message=i.message,
        )
        for i in raw
    ]
    return StructureGapsOut(
        issues=issues, map_count=len(visible), issue_count=len(issues)
    )


# ── O2 Concepts ──────────────────────────────────────────────────────────


def _concept_out(c: Concept, map_count: int = 0) -> ConceptOut:
    return ConceptOut(
        id=c.id,
        name=c.name,
        aliases=c.aliases or [],
        workflow_level=c.workflow_level,
        description=c.description or "",
        created_by=c.created_by,
        status=c.status,
        map_count=map_count,
    )


@router.get("/concepts", response_model=list[ConceptOut])
async def list_concepts(
    session: AsyncSession = Depends(get_session),
) -> list[ConceptOut]:
    rows = list(
        (await session.scalars(select(Concept).order_by(Concept.name.asc()))).all()
    )
    out: list[ConceptOut] = []
    for c in rows:
        cnt = len(
            (
                await session.scalars(
                    select(ProcessMap).where(
                        ProcessMap.concept_id == c.id,
                        ProcessMap.deleted_at.is_(None),
                    )
                )
            ).all()
        )
        out.append(_concept_out(c, cnt))
    return out


@router.post("/concepts", response_model=ConceptOut)
async def create_concept(
    payload: ConceptCreate,
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ConceptOut:
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="name required")
    existing = await session.scalar(select(Concept).where(Concept.name == name))
    if existing is not None:
        raise HTTPException(status_code=409, detail="concept name already exists")
    aliases = [a.strip() for a in payload.aliases if a and a.strip()]
    c = Concept(
        name=name,
        aliases=aliases,
        workflow_level=payload.workflow_level,
        description=payload.description.strip(),
        created_by=user,
        status="active",
    )
    session.add(c)
    await session.commit()
    await session.refresh(c)
    return _concept_out(c, 0)


@router.get("/concepts/{concept_id}", response_model=ConceptOut)
async def get_concept(
    concept_id: int,
    session: AsyncSession = Depends(get_session),
) -> ConceptOut:
    c = await session.get(Concept, concept_id)
    if c is None:
        raise HTTPException(status_code=404, detail="concept not found")
    cnt = len(
        (
            await session.scalars(
                select(ProcessMap).where(
                    ProcessMap.concept_id == c.id,
                    ProcessMap.deleted_at.is_(None),
                )
            )
        ).all()
    )
    return _concept_out(c, cnt)


@router.patch("/concepts/{concept_id}", response_model=ConceptOut)
async def patch_concept(
    concept_id: int,
    payload: ConceptUpdate,
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ConceptOut:
    c = await session.get(Concept, concept_id)
    if c is None:
        raise HTTPException(status_code=404, detail="concept not found")
    if c.created_by != user and not is_sysadmin(user):
        raise HTTPException(status_code=403, detail="only creator or sysadmin")
    if payload.name is not None:
        name = payload.name.strip()
        clash = await session.scalar(
            select(Concept).where(Concept.name == name, Concept.id != concept_id)
        )
        if clash is not None:
            raise HTTPException(status_code=409, detail="concept name already exists")
        c.name = name
    if payload.aliases is not None:
        c.aliases = [a.strip() for a in payload.aliases if a and a.strip()]
    if "workflow_level" in payload.model_fields_set:
        c.workflow_level = payload.workflow_level
    if payload.description is not None:
        c.description = payload.description.strip()
    if payload.status is not None:
        if payload.status not in ("active", "archived"):
            raise HTTPException(status_code=400, detail="status must be active|archived")
        c.status = payload.status
    await session.commit()
    await session.refresh(c)
    return _concept_out(c, 0)


@router.post(
    "/maps/{map_id}/concept",
    response_model=ConceptOut | None,
    dependencies=[Depends(require_map_role("editor"))],
)
async def attach_map_concept(
    map_id: int,
    payload: MapConceptIn,
    session: AsyncSession = Depends(get_session),
) -> ConceptOut | None:
    pmap = await session.get(ProcessMap, map_id)
    if pmap is None or pmap.deleted_at is not None:
        raise HTTPException(status_code=404, detail="map not found")
    if payload.concept_id is None:
        pmap.concept_id = None
        await session.commit()
        return None
    c = await session.get(Concept, payload.concept_id)
    if c is None or c.status == "archived":
        raise HTTPException(status_code=404, detail="concept not found")
    pmap.concept_id = c.id
    await session.commit()
    return _concept_out(c, 0)


@router.get("/concepts/{concept_id}/maps")
async def concept_maps(
    concept_id: int,
    session: AsyncSession = Depends(get_session),
    user: str = Depends(get_current_user),
) -> list[dict]:
    c = await session.get(Concept, concept_id)
    if c is None:
        raise HTTPException(status_code=404, detail="concept not found")
    rows = list(
        (
            await session.scalars(
                select(ProcessMap).where(
                    ProcessMap.concept_id == concept_id,
                    ProcessMap.deleted_at.is_(None),
                )
            )
        ).all()
    )
    out: list[dict] = []
    for m in rows:
        role = await get_effective_role(session, user, m.id)
        if role is None and not is_sysadmin(user):
            continue
        out.append(
            {
                "id": m.id,
                "name": m.name,
                "workflow_level": m.workflow_level,
                "parent_map_id": m.parent_map_id,
            }
        )
    return out


# ── O3 Relations + callers ───────────────────────────────────────────────


@router.get("/maps/{map_id}/callers", response_model=list[CallerOut])
async def map_callers(
    map_id: int,
    session: AsyncSession = Depends(get_session),
    user: str = Depends(get_current_user),
) -> list[CallerOut]:
    target = await session.get(ProcessMap, map_id)
    if target is None or target.deleted_at is not None:
        raise HTTPException(status_code=404, detail="map not found")
    # Caller maps must be visible to user
    visible = await _visible_maps(session, user)
    vis_ids = {m.id for m in visible}
    if map_id not in vis_ids and not is_sysadmin(user):
        role = await get_effective_role(session, user, map_id)
        if role is None:
            raise HTTPException(status_code=403, detail="forbidden")

    versions = list((await session.scalars(select(MapVersion))).all())
    nodes = list(
        (
            await session.scalars(
                select(Node).where(Node.linked_map_id == map_id)
            )
        ).all()
    )
    # latest version per map
    latest: dict[int, int] = {}
    for v in versions:
        if v.map_id not in latest or v.id > latest[v.map_id]:
            latest[v.map_id] = v.id
    map_names = {
        m.id: m.name
        for m in (
            await session.scalars(select(ProcessMap).where(ProcessMap.deleted_at.is_(None)))
        ).all()
    }
    out: list[CallerOut] = []
    for n in nodes:
        # find host map for this version
        ver = next((v for v in versions if v.id == n.version_id), None)
        if ver is None:
            continue
        if latest.get(ver.map_id) != ver.id:
            continue  # only latest version
        if ver.map_id not in vis_ids and not is_sysadmin(user):
            continue
        out.append(
            CallerOut(
                map_id=ver.map_id,
                map_name=map_names.get(ver.map_id, f"#{ver.map_id}"),
                version_id=ver.id,
                node_id=n.id,
                node_title=n.title or n.id,
            )
        )
    return out


def _rel_out(r: ArchitectureRelation, *, derived: bool = False) -> RelationOut:
    return RelationOut(
        id=r.id,
        relation_type=r.relation_type,
        source_map_id=r.source_map_id,
        target_map_id=r.target_map_id,
        source_concept_id=r.source_concept_id,
        target_concept_id=r.target_concept_id,
        note=r.note or "",
        created_by=r.created_by,
        derived=derived,
    )


@router.get("/architecture/relations", response_model=list[RelationOut])
async def list_relations(
    map_id: int | None = None,
    session: AsyncSession = Depends(get_session),
) -> list[RelationOut]:
    q = select(ArchitectureRelation).order_by(ArchitectureRelation.id.desc())
    rows = list((await session.scalars(q)).all())
    if map_id is not None:
        rows = [
            r
            for r in rows
            if r.source_map_id == map_id or r.target_map_id == map_id
        ]
    return [_rel_out(r) for r in rows]


@router.post("/architecture/relations", response_model=RelationOut)
async def create_relation(
    payload: RelationCreate,
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> RelationOut:
    rtype = (payload.relation_type or "").strip().lower()
    if rtype not in RELATION_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"relation_type must be one of {sorted(RELATION_TYPES)}",
        )
    err = relation_endpoints_ok(
        source_map_id=payload.source_map_id,
        target_map_id=payload.target_map_id,
        source_concept_id=payload.source_concept_id,
        target_concept_id=payload.target_concept_id,
    )
    if err:
        raise HTTPException(status_code=400, detail=err)
    # existence checks
    for mid in (payload.source_map_id, payload.target_map_id):
        if mid is None:
            continue
        m = await session.get(ProcessMap, mid)
        if m is None or m.deleted_at is not None:
            raise HTTPException(status_code=400, detail=f"map {mid} not found")
    for cid in (payload.source_concept_id, payload.target_concept_id):
        if cid is None:
            continue
        c = await session.get(Concept, cid)
        if c is None:
            raise HTTPException(status_code=400, detail=f"concept {cid} not found")

    # duplicate
    existing = list((await session.scalars(select(ArchitectureRelation))).all())
    for e in existing:
        if (
            e.relation_type == rtype
            and e.source_map_id == payload.source_map_id
            and e.target_map_id == payload.target_map_id
            and e.source_concept_id == payload.source_concept_id
            and e.target_concept_id == payload.target_concept_id
        ):
            raise HTTPException(status_code=409, detail="relation already exists")

    rel = ArchitectureRelation(
        relation_type=rtype,
        source_map_id=payload.source_map_id,
        target_map_id=payload.target_map_id,
        source_concept_id=payload.source_concept_id,
        target_concept_id=payload.target_concept_id,
        note=payload.note.strip(),
        created_by=user,
    )
    session.add(rel)
    await session.commit()
    await session.refresh(rel)
    return _rel_out(rel)


@router.delete("/architecture/relations/{relation_id}")
async def delete_relation(
    relation_id: int,
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> dict:
    rel = await session.get(ArchitectureRelation, relation_id)
    if rel is None:
        raise HTTPException(status_code=404, detail="relation not found")
    if rel.created_by != user and not is_sysadmin(user):
        raise HTTPException(status_code=403, detail="only creator or sysadmin")
    await session.delete(rel)
    await session.commit()
    return {"ok": True}


@router.get("/maps/{map_id}/architecture", response_model=MapArchitectureOut)
async def map_architecture(
    map_id: int,
    session: AsyncSession = Depends(get_session),
    user: str = Depends(get_current_user),
) -> MapArchitectureOut:
    pmap = await session.get(ProcessMap, map_id)
    if pmap is None or pmap.deleted_at is not None:
        raise HTTPException(status_code=404, detail="map not found")
    callers = await map_callers(map_id, session, user)
    children = list(
        (
            await session.scalars(
                select(ProcessMap).where(
                    ProcessMap.parent_map_id == map_id,
                    ProcessMap.deleted_at.is_(None),
                )
            )
        ).all()
    )
    versions = list(
        (
            await session.scalars(select(MapVersion).where(MapVersion.map_id == map_id))
        ).all()
    )
    nodes: list[Node] = []
    if versions:
        latest = max(versions, key=lambda v: v.id)
        nodes = list(
            (
                await session.scalars(select(Node).where(Node.version_id == latest.id))
            ).all()
        )
    derived_calls = sorted(
        {int(n.linked_map_id) for n in nodes if n.linked_map_id is not None}
    )
    explicit_rows = list(
        (
            await session.scalars(
                select(ArchitectureRelation).where(
                    (ArchitectureRelation.source_map_id == map_id)
                    | (ArchitectureRelation.target_map_id == map_id)
                )
            )
        ).all()
    )
    return MapArchitectureOut(
        map_id=map_id,
        callers=callers,
        derived_contains_children=[c.id for c in children],
        derived_calls=derived_calls,
        explicit=[_rel_out(r) for r in explicit_rows],
    )
