from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.social_impact import analyze_social_impact

router = APIRouter()

class SocialImpactRequest(BaseModel):
    keyword: str

@router.post("/api/social-impact")
async def get_social_impact(req: SocialImpactRequest):
    """Fetch and calculate social media impact analytics using API Direct."""
    if not req.keyword or len(req.keyword.strip()) == 0:
        raise HTTPException(status_code=400, detail="Keyword cannot be empty")
    
    result = await analyze_social_impact(req.keyword)
    if not result.get("success", True):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to run impact analysis"))
        
    return result
