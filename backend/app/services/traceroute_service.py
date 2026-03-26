import asyncio
from typing import Dict, Any, List
import re
from app.services.geoip import GeoIPService

class TracerouteHop:
    def __init__(self, hop: int, ip: str, latency: str):
        self.hop = hop
        self.ip = ip
        self.latency = latency

class TracerouteService:
    def __init__(self):
        self.geo_service = GeoIPService()
        pass

    async def execute(self, target_ip: str) -> Dict[str, Any]:
        """Runs traceroute asynchronously and parses the results line-by-line."""
        
        # -n = skip DNS resolution (faster), -w 1 = 1 sec wait max, -m 20 = max 20 hops
        cmd = ["traceroute", "-n", "-w", "1", "-m", "20", target_ip]
        
        try:
            # Spawn the traceroute subprocess
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await process.communicate()
            
            if process.returncode != 0 and not stdout:
                return {"ip": target_ip, "error": f"Traceroute failed: {stderr.decode()}"}
                
            output = stdout.decode()
            lines = output.split('\n')
            
            hops: List[Dict[str, Any]] = []
            
            # Simple line-by-line Regex parser for standard linux traceroute output
            # Skips the first line which is the traceroute target header
            for line in lines[1:]:
                line = line.strip()
                if not line:
                    continue
                    
                # Extract hop number
                parts = line.split()
                if not parts[0].isdigit():
                    continue
                    
                hop_num = int(parts[0])
                ip_addr = "*"
                latencies = []
                
                # Check for IPs and ms blocks
                for i in range(1, len(parts)):
                    part = parts[i]
                    # Regex for IPv4/IPv6
                    if re.match(r"^[0-9a-f.:]+$", part) and part != "*":
                        if ip_addr == "*":
                            ip_addr = part
                    elif part == "ms" and i > 0:
                        latencies.append(parts[i-1])
                
                # If there are latencies, take the best/first one. If none, it's a timeout.
                best_latency = latencies[0] + " ms" if latencies else "Timed out"
                
                hop_data = {
                    "hop": hop_num,
                    "ip": ip_addr,
                    "latency": best_latency
                }

                if ip_addr != "*":
                    try:
                        geo = self.geo_service.get_geo_data(ip_addr)
                        hop_data["lat"] = geo.get("lat")
                        hop_data["lon"] = geo.get("lon")
                    except Exception:
                        pass
                
                hops.append(hop_data)

            return {"ip": target_ip, "hops": hops}
            
        except FileNotFoundError:
            return {"ip": target_ip, "error": "'traceroute' command not found on the host system."}
        except Exception as e:
            return {"ip": target_ip, "error": str(e)}
