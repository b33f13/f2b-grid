from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.geoip import GeoIPService

router = APIRouter()
geo_service = GeoIPService()

class GeoResponse(BaseModel):
    ip: str
    country: str
    city: str
    lat: float
    lon: float
    asn: str
    isp: str

@router.get("/{ip}", response_model=GeoResponse)
def get_geo(ip: str):
    """Resolve an IP address to geographical coordinates & ISP."""
    try:
        data = geo_service.get_geo_data(ip)
        return GeoResponse(ip=ip, **data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
