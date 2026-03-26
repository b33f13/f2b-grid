import random
from typing import Dict, Any

class GeoIPService:
    def __init__(self, db_path: str = None):
        # We would initialize maxminddb Reader here
        self.db_path = db_path
        
        # Hardcoded realistic coordinates for our mock data
        self.mock_locations = [
            {"country": "RU", "city": "Moscow", "lat": 55.7558, "lon": 37.6173, "asn": "AS12345", "isp": "Rostelecom"},
            {"country": "CN", "city": "Beijing", "lat": 39.9042, "lon": 116.4074, "asn": "AS4134", "isp": "China Telecom"},
            {"country": "US", "city": "Ashburn", "lat": 39.0438, "lon": -77.4874, "asn": "AS16509", "isp": "Amazon.com"},
            {"country": "DE", "city": "Frankfurt", "lat": 50.1109, "lon": 8.6821, "asn": "AS3320", "isp": "Deutsche Telekom"},
            {"country": "BR", "city": "Sao Paulo", "lat": -23.5505, "lon": -46.6333, "asn": "AS28573", "isp": "Claro"},
            {"country": "IN", "city": "Mumbai", "lat": 19.0760, "lon": 72.8777, "asn": "AS45609", "isp": "Bharti Airtel"},
            {"country": "TR", "city": "Istanbul", "lat": 41.0082, "lon": 28.9784, "asn": "AS47331", "isp": "TTNet"},
            {"country": "GB", "city": "London", "lat": 51.5074, "lon": -0.1278, "asn": "AS2856", "isp": "British Telecommunications"}
        ]

    def get_geo_data(self, ip: str) -> Dict[str, Any]:
        """
        Since we are developing locally without a MaxMind key yet,
        we seed a deterministic pseudo-random location based on the IP address string
        so the same IP always gets the same location.
        """
        # Simple string hash to pick a consistent index
        idx = hash(ip) % len(self.mock_locations)
        data = self.mock_locations[idx].copy()
        
        # Add slight jitter to coordinates so they don't exactly overlap on the map
        jitter_lat = (hash(ip + "lat") % 1000) / 10000.0
        jitter_lon = (hash(ip + "lon") % 1000) / 10000.0
        
        data["lat"] = float(data["lat"]) + (jitter_lat - 0.05)
        data["lon"] = float(data["lon"]) + (jitter_lon - 0.05)
        
        return data
