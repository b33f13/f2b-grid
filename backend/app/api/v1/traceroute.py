from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import ipaddress
from app.services.traceroute_service import TracerouteService
from app.core.limiter import limiter

router = APIRouter()
tr_service = TracerouteService()

class Hop(BaseModel):
    hop: int
    ip: str
    latency: str
    lat: Optional[float] = None
    lon: Optional[float] = None

class TracerouteResponse(BaseModel):
    ip: str
    error: Optional[str] = None
    hops: List[Hop] = []

@router.get("/{ip}", response_model=TracerouteResponse)
@limiter.limit("3/minute")
async def get_traceroute(request: Request, ip: str):
    """Executes a live server-side traceroute to the IP asynchronously."""
    # SSRF Protection: Validate proper public IP address
    try:
        ip_obj = ipaddress.ip_address(ip)
        if ip_obj.is_loopback or ip_obj.is_private or ip_obj.is_multicast:
            return {"ip": ip, "error": f"Invalid or non-public IP address: {ip}", "hops": []}
    except ValueError:
        return {"ip": ip, "error": f"Invalid IP address format: {ip}", "hops": []}

    data = await tr_service.execute(ip)
    
    # Return 200 even with execution errors object for frontend logic
    if "error" in data:
        return data
        
    return TracerouteResponse(**data)
