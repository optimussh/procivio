"""Structure tree API — Domain…Task hierarchy (not under /maps/{map_id})."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_session
from app.structure_tree import build_structure_response
from app.schemas import StructureTreeOut

router = APIRouter(
    prefix="/api",
    tags=["structure"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/structure", response_model=StructureTreeOut)
async def get_structure_tree(
    session: AsyncSession = Depends(get_session),
    user: str = Depends(get_current_user),
) -> StructureTreeOut:
    """Visible maps as L1 Domain…L5 Task tree via parent_map_id.

    Industry tags (description ``industry:…``) group L1 roots for catalog demos —
    industry is not a workflow level.

    Path is /api/structure (not /api/maps/structure) so it never collides with
    GET /api/maps/{map_id} which would parse \"structure\" as an int and 422.
    """
    # Lazy import avoids any circular import with maps router at module load
    from app.routers.maps import list_maps

    visible = await list_maps(session=session, user=user)
    return build_structure_response(list(visible))
