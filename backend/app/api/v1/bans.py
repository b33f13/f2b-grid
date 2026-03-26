from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional, Any
import asyncio
import csv
import io

from app.services.fail2ban import Fail2BanService
from app.services.log_parser import LogParserService
from app.core.config import settings

router = APIRouter()
f2b_service = Fail2BanService()
log_service = LogParserService(log_path=settings.f2b_log_path)

class BannedEntry(BaseModel):
    ip: str
    jail: str
    bannedAt: int
    unbannedAt: Optional[int]
    failCount: int
    isActive: bool
    protocol: str
    port: Optional[int]

class PaginatedBansResponse(BaseModel):
    total: int
    items: List[BannedEntry]

class StatsResponse(BaseModel):
    total_bans: int
    active_bans: int
    top_jail: str

class TimelineItem(BaseModel):
    date: str
    count: int

class JailItem(BaseModel):
    jail: str
    count: int

class CountryItem(BaseModel):
    country: str
    count: int

@router.get("", response_model=PaginatedBansResponse)
def get_bans(
    limit: int = Query(100, ge=1, le=1000), 
    offset: int = Query(0, ge=0),
    active_only: bool = Query(False),
    search: Optional[str] = Query(None),
    jail: Optional[str] = Query(None),
    sort_by: str = Query("timeofban"),
    sort_desc: bool = Query(True)
):
    """Get all bans, paginated and filtered."""
    return f2b_service.get_bans(
        limit=limit, offset=offset, active_only=active_only,
        search=search, jail=jail, sort_by=sort_by, sort_desc=sort_desc
    )

@router.get("/active", response_model=PaginatedBansResponse)
def get_active_bans(
    limit: int = Query(100, ge=1, le=1000), 
    offset: int = Query(0, ge=0)
):
    """Get active bans only, paginated."""
    return f2b_service.get_bans(limit=limit, offset=offset, active_only=True)

@router.get("/stats", response_model=StatsResponse)
def get_stats():
    """Get ban statistics. Log-first: always uses log for totals, DB for active counts if available."""
    # Always get totals from the log (most complete source)
    log_stats = log_service.get_log_stats()
    total_bans = log_stats["total_bans"]

    active_bans = 0
    top_jail = "N/A"

    # Try DB for active count and top jail
    try:
        db_stats = f2b_service.get_stats()
        active_bans = db_stats["active_bans"]
        top_jail = db_stats["top_jail"]
    except Exception:
        # Fallback: derive active_bans and top_jail from log
        try:
            from collections import Counter
            history = log_service.get_history(limit=99999)
            active_entries = [e for e in history["items"] if e["isActive"]]
            active_bans = len(active_entries)
            if active_entries:
                jail_counts = Counter(e["jail"] for e in active_entries)
                top_jail = jail_counts.most_common(1)[0][0]
        except Exception:
            pass

    return {
        "total_bans": total_bans,
        "active_bans": active_bans,
        "top_jail": top_jail,
    }

@router.get("/stats/timeline", response_model=List[TimelineItem])
def get_timeline():
    """Get ban timeline for chart."""
    return f2b_service.get_timeline()

@router.get("/stats/countries", response_model=List[CountryItem])
def get_countries():
    """Get top blocked countries for chart."""
    return f2b_service.get_top_countries()

@router.get("/jails", response_model=List[JailItem])
def get_jails():
    """Get jails distribution."""
    return f2b_service.get_jails()

@router.get("/jails/active", response_model=List[JailItem])
def get_active_jails():
    """Get active jails distribution. Uses DB if available, falls back to log."""
    try:
        return f2b_service.get_active_jails()
    except Exception:
        # Fallback: derive active jail counts from log
        from collections import Counter
        history = log_service.get_history(limit=99999)
        active_entries = [e for e in history["items"] if e["isActive"]]
        jail_counts = Counter(e["jail"] for e in active_entries)
        return [{"jail": j, "count": c} for j, c in jail_counts.most_common()]

@router.get("/export")
def export_csv(
    active_only: bool = Query(False),
    search: Optional[str] = Query(None),
    jail: Optional[str] = Query(None),
):
    """Export filtered bans as CSV."""
    # Fetch all matching without large limits for export
    data = f2b_service.get_bans(
        limit=50000, offset=0, active_only=active_only,
        search=search, jail=jail, sort_by="timeofban", sort_desc=True
    )
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['IP', 'Jail', 'BannedAt', 'UnbannedAt', 'FailCount', 'IsActive'])
    
    for item in data["items"]:
        writer.writerow([
            item["ip"],
            item["jail"],
            item["bannedAt"],
            item["unbannedAt"],
            item["failCount"],
            item["isActive"]
        ])
        
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=f2b_export.csv"}
    )

# Historical data from log file
@router.get("/history", response_model=PaginatedBansResponse)
def get_history(
    limit: int = Query(100, ge=1, le=5000),
    offset: int = Query(0, ge=0),
    active_only: bool = Query(False),
    search: Optional[str] = Query(None),
    jail: Optional[str] = Query(None),
    sort_by: str = Query("timeofban"),
    sort_desc: bool = Query(True)
):
    """Get historical bans from fail2ban.log (includes expired bans)."""
    return log_service.get_history(
        limit=limit, offset=offset, active_only=active_only,
        search=search, jail=jail, sort_by=sort_by, sort_desc=sort_desc
    )

@router.get("/history/jails", response_model=List[JailItem])
def get_history_jails():
    """Get jail list with counts from the log file."""
    return log_service.get_jails_from_log()


@router.websocket("/ws/live")
async def live_feed(websocket: WebSocket):
    await websocket.accept()
    try:
        # Simplified polling loop backing the websocket feed
        while True:
            # Send latest stats periodically.
            # In a real app we might only push diffs or new bans.
            stats = f2b_service.get_stats()
            recent_bans = f2b_service.get_bans(limit=5, offset=0, active_only=False)
            
            await websocket.send_json({
                "type": "update",
                "stats": stats,
                "recent": recent_bans
            })
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        print("WebSocket client disconnected")
