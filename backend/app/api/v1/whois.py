from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import ipaddress
from app.services.whois_service import WhoisService
from app.core.limiter import limiter

router = APIRouter()
whois_svc = WhoisService()

class Contact(BaseModel):
    name: Optional[str] = None
    emails: List[str] = []
    roles: List[str] = []

class WhoisResponse(BaseModel):
    ip: str
    asn: Optional[str] = None
    cidr: Optional[str] = None
    contacts: List[Contact] = []
    error: Optional[str] = None
    raw: Optional[Dict[str, Any]] = None

@router.get("/{ip}", response_model=WhoisResponse)
@limiter.limit("5/minute")
def get_whois(request: Request, ip: str):
    """Fetch WHOIS/RDAP info for an IP address with backend LRU caching."""
    # SSRF Protection: Validate proper public IP address
    try:
        ip_obj = ipaddress.ip_address(ip)
        if ip_obj.is_loopback or ip_obj.is_private or ip_obj.is_multicast:
            return {"ip": ip, "error": f"Invalid or non-public IP address: {ip}"}
    except ValueError:
        return {"ip": ip, "error": f"Invalid IP address format: {ip}"}

    data = whois_svc.lookup(ip)
    
    if "error" in data:
        # We still return 200 with an error field rather than killing the frontend workflow
        return data
        
    return WhoisResponse(**data)
