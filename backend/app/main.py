from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.api.v1 import bans, geo, whois, traceroute
from app.core.limiter import limiter

app = FastAPI(
    title="F2B-GRID API",
    description="Backend API for Fail2Ban Cyberpunk Dashboard",
    version="1.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration - strictly localhost only
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Healthcheck
@app.get("/api/v1/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}

app.include_router(bans.router, prefix="/api/v1/bans", tags=["Bans"])
app.include_router(geo.router, prefix="/api/v1/geo", tags=["GeoIP"])
app.include_router(whois.router, prefix="/api/v1/whois", tags=["WHOIS"])
app.include_router(traceroute.router, prefix="/api/v1/traceroute", tags=["Traceroute"])
