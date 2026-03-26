from ipwhois import IPWhois
from functools import lru_cache
import json
from typing import Dict, Any

class WhoisService:
    @lru_cache(maxsize=1000)
    def lookup(self, ip: str) -> Dict[str, Any]:
        """
        Perform an RDAP lookup for the given IP address.
        Responses are heavily cached via LRU cache in memory to prevent rate-limiting.
        """
        try:
            obj = IPWhois(ip)
            results = obj.lookup_rdap(depth=1)
            
            # Extract basic ASN info
            asn = results.get("asn", "Unknown")
            asn_description = results.get("asn_description", "Unknown")
            network = results.get("network", {})
            cidr = network.get("cidr", "Unknown")
            
            # Format entities cleanly
            entities = results.get("entities", [])
            contacts = []
            if entities:
                for entity in entities:
                    ent_data = results.get("objects", {}).get(entity, {})
                    contact_data = ent_data.get("contact", {})
                    name = contact_data.get("name", entity)
                    emails = [e.get("value") for e in contact_data.get("email", [])] if contact_data.get("email") else []
                    
                    contacts.append({
                        "name": name,
                        "emails": emails,
                        "roles": ent_data.get("roles", [])
                    })
                    
            return {
                "ip": ip,
                "asn": f"AS{asn} - {asn_description}",
                "cidr": cidr,
                "contacts": contacts,
                "raw": results # Provide raw just in case frontend needs more advanced fields
            }
            
        except Exception as e:
            return {"error": str(e), "ip": ip}
