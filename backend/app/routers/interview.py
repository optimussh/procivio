"""Multi-stakeholder interview collection (P3)."""

from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_prompt import INQUIRE_SCRIPT
from app.auth import get_current_user
from app.db import get_session
from app.models import InterviewCampaign, InterviewResponse, ProcessMap
from app.permissions.deps import require_map_role

router = APIRouter(prefix="/api", tags=["interview"])


class CampaignCreateIn(BaseModel):
    title: str = Field(default="Process interview", max_length=200)
    # empty → default Inquire script
    questions: list[dict] | None = None


class CampaignOut(BaseModel):
    id: int
    map_id: int
    token: str
    title: str
    questions: list
    status: str
    created_by: str
    response_count: int = 0
    share_path: str = ""


class ResponseIn(BaseModel):
    respondent_name: str = Field(default="", max_length=200)
    answers: dict[str, str] = Field(default_factory=dict)


class ResponseOut(BaseModel):
    id: int
    respondent_name: str
    answers: dict
    created_at: str


class PublicCampaignOut(BaseModel):
    title: str
    questions: list
    status: str


def _default_questions() -> list[dict]:
    return [{"id": k, "prompt": p} for k, p in INQUIRE_SCRIPT]


@router.post(
    "/maps/{map_id}/interview-campaigns",
    response_model=CampaignOut,
    dependencies=[Depends(require_map_role("editor"))],
)
async def create_campaign(
    map_id: int,
    payload: CampaignCreateIn,
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CampaignOut:
    pmap = await session.get(ProcessMap, map_id)
    if pmap is None or pmap.deleted_at is not None:
        raise HTTPException(status_code=404, detail="map not found")
    qs = payload.questions if payload.questions else _default_questions()
    token = secrets.token_urlsafe(24)
    camp = InterviewCampaign(
        map_id=map_id,
        token=token,
        title=payload.title.strip() or "Process interview",
        questions=qs,
        created_by=user,
        status="open",
    )
    session.add(camp)
    await session.commit()
    await session.refresh(camp)
    return CampaignOut(
        id=camp.id,
        map_id=camp.map_id,
        token=camp.token,
        title=camp.title,
        questions=camp.questions or [],
        status=camp.status,
        created_by=camp.created_by,
        response_count=0,
        share_path=f"/interview/{camp.token}",
    )


@router.get(
    "/maps/{map_id}/interview-campaigns",
    response_model=list[CampaignOut],
    dependencies=[Depends(require_map_role("viewer"))],
)
async def list_campaigns(
    map_id: int,
    session: AsyncSession = Depends(get_session),
) -> list[CampaignOut]:
    rows = (
        await session.scalars(
            select(InterviewCampaign)
            .where(InterviewCampaign.map_id == map_id)
            .order_by(InterviewCampaign.id.desc())
        )
    ).all()
    out: list[CampaignOut] = []
    for c in rows:
        cnt = len(
            (
                await session.scalars(
                    select(InterviewResponse).where(InterviewResponse.campaign_id == c.id)
                )
            ).all()
        )
        out.append(
            CampaignOut(
                id=c.id,
                map_id=c.map_id,
                token=c.token,
                title=c.title,
                questions=c.questions or [],
                status=c.status,
                created_by=c.created_by,
                response_count=cnt,
                share_path=f"/interview/{c.token}",
            )
        )
    return out


@router.get("/interview/c/{token}", response_model=PublicCampaignOut)
async def public_campaign(
    token: str,
    session: AsyncSession = Depends(get_session),
) -> PublicCampaignOut:
    """공개 폼 — 인증 불필요 (토큰 게이트)."""
    camp = await session.scalar(
        select(InterviewCampaign).where(InterviewCampaign.token == token)
    )
    if camp is None:
        raise HTTPException(status_code=404, detail="campaign not found")
    return PublicCampaignOut(
        title=camp.title,
        questions=camp.questions or [],
        status=camp.status,
    )


@router.post("/interview/c/{token}/responses", response_model=ResponseOut)
async def submit_response(
    token: str,
    payload: ResponseIn,
    session: AsyncSession = Depends(get_session),
) -> ResponseOut:
    camp = await session.scalar(
        select(InterviewCampaign).where(InterviewCampaign.token == token)
    )
    if camp is None:
        raise HTTPException(status_code=404, detail="campaign not found")
    if camp.status != "open":
        raise HTTPException(status_code=409, detail="campaign is closed")
    cleaned = {k: str(v).strip() for k, v in payload.answers.items() if str(v).strip()}
    if not cleaned:
        raise HTTPException(status_code=400, detail="answers required")
    resp = InterviewResponse(
        campaign_id=camp.id,
        respondent_name=payload.respondent_name.strip() or "Anonymous",
        answers=cleaned,
    )
    session.add(resp)
    await session.commit()
    await session.refresh(resp)
    return ResponseOut(
        id=resp.id,
        respondent_name=resp.respondent_name,
        answers=resp.answers or {},
        created_at=resp.created_at.isoformat(),
    )


@router.get(
    "/interview-campaigns/{campaign_id}/responses",
    response_model=list[ResponseOut],
)
async def list_responses(
    campaign_id: int,
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ResponseOut]:
    from app.permissions.access import get_effective_role
    from app.permissions.logic import is_sysadmin

    camp = await session.get(InterviewCampaign, campaign_id)
    if camp is None:
        raise HTTPException(status_code=404, detail="campaign not found")
    role = await get_effective_role(session, user, camp.map_id)
    if role is None and not is_sysadmin(user):
        raise HTTPException(status_code=403, detail="forbidden")
    rows = (
        await session.scalars(
            select(InterviewResponse)
            .where(InterviewResponse.campaign_id == campaign_id)
            .order_by(InterviewResponse.id.desc())
        )
    ).all()
    return [
        ResponseOut(
            id=r.id,
            respondent_name=r.respondent_name,
            answers=r.answers or {},
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]


class SynthesizeOut(BaseModel):
    transcript: str
    response_count: int


@router.post(
    "/interview-campaigns/{campaign_id}/synthesize",
    response_model=SynthesizeOut,
)
async def synthesize_transcript(
    campaign_id: int,
    user: str = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SynthesizeOut:
    """응답을 하나의 트랜스크립트 텍스트로 합침 → from-transcript 입력용."""
    from app.permissions.access import get_effective_role
    from app.permissions.logic import is_sysadmin

    camp = await session.get(InterviewCampaign, campaign_id)
    if camp is None:
        raise HTTPException(status_code=404, detail="campaign not found")
    role = await get_effective_role(session, user, camp.map_id)
    if role is None and not is_sysadmin(user):
        raise HTTPException(status_code=403, detail="forbidden")
    rows = (
        await session.scalars(
            select(InterviewResponse).where(InterviewResponse.campaign_id == campaign_id)
        )
    ).all()
    if not rows:
        raise HTTPException(status_code=400, detail="no responses yet")
    qmap = {q.get("id"): q.get("prompt", q.get("id")) for q in (camp.questions or [])}
    parts: list[str] = [f"# Interview synthesis: {camp.title}\n"]
    for r in rows:
        parts.append(f"\n## Respondent: {r.respondent_name}\n")
        for k, v in (r.answers or {}).items():
            prompt = qmap.get(k, k)
            parts.append(f"Q ({prompt}): {v}\n")
    text = "".join(parts)
    return SynthesizeOut(transcript=text, response_count=len(rows))
