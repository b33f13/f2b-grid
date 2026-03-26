import sqlite3
import json
import time
import os
from typing import List, Dict, Any
from collections import Counter
from app.core.config import settings
from app.services.geoip import GeoIPService

class Fail2BanService:
    def __init__(self, db_path: str = None):
        self.db_path = db_path or settings.f2b_db_path
        self.geo_svc = GeoIPService()

    def _get_connection(self):
        # Read-only connection using uri parameter for safety
        abs_path = os.path.abspath(self.db_path)
        if not os.path.exists(abs_path):
            raise FileNotFoundError(f"Fail2ban DB not found: {abs_path}")
        conn = sqlite3.connect(f"file:{abs_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        return conn

    def is_db_available(self) -> bool:
        try:
            self._get_connection().close()
            return True
        except Exception:
            return False

    def _parse_failures(self, row) -> int:
        """Extract failure count from the JSON data column, fall back to bancount."""
        try:
            data = json.loads(row['data']) if row['data'] else {}
            return data.get('failures', row['bancount'])
        except Exception:
            return row['bancount']

    def get_bans(
        self, 
        limit: int = 100, 
        offset: int = 0, 
        active_only: bool = False,
        search: str = None,
        jail: str = None,
        sort_by: str = "timeofban",
        sort_desc: bool = True
    ) -> Dict[str, Any]:
        
        base_query = " FROM bans WHERE 1=1"
        params = []
        
        now = int(time.time())
        if active_only:
            base_query += " AND (timeofban + bantime) > ?"
            params.append(now)
            
        if search:
            base_query += " AND ip LIKE ?"
            params.append(f"%{search}%")
            
        if jail:
            base_query += " AND name = ?"
            params.append(jail)
            
        # Validate sort column to prevent SQL injection
        # Real schema column is `name`
        valid_sort_cols = {"ip": "ip", "jail": "name", "timeofban": "timeofban", "bancount": "bancount"}
        sort_col = valid_sort_cols.get(sort_by, "timeofban")
        direction = "DESC" if sort_desc else "ASC"
        
        count_query = f"SELECT COUNT(*) as count{base_query}"
        data_query = f"SELECT *{base_query} ORDER BY {sort_col} {direction} LIMIT ? OFFSET ?"
        
        count_params = params.copy()
        data_params = params.copy() + [limit, offset]
        
        with self._get_connection() as conn:
            cur = conn.cursor()
            
            cur.execute(count_query, count_params)
            total = cur.fetchone()['count']
            
            cur.execute(data_query, data_params)
            rows = cur.fetchall()
            
            bans = []
            for row in rows:
                # bantime of -1 means permanent ban
                if row['bantime'] < 0:
                    ban_end = None
                    is_active = True
                else:
                    ban_end = row['timeofban'] + row['bantime']
                    is_active = now < ban_end
                failures = self._parse_failures(row)
                
                bans.append({
                    "ip": row['ip'],
                    "jail": row['name'],
                    "bannedAt": row['timeofban'],
                    "unbannedAt": ban_end,
                    "failCount": failures,
                    "isActive": is_active,
                    "protocol": "tcp",
                    "port": None
                })
            return {"total": total, "items": bans}
            
    def get_stats(self) -> Dict[str, Any]:
        now = int(time.time())
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) as total FROM bans")
            total = cur.fetchone()['total']
            
            cur.execute("SELECT COUNT(*) as active FROM bans WHERE bantime < 0 OR (timeofban + bantime) > ?", (now,))
            active = cur.fetchone()['active']

            cur.execute("SELECT name as jail, COUNT(*) as count FROM bans GROUP BY name ORDER BY count DESC LIMIT 1")
            top_jail_row = cur.fetchone()
            top_jail = top_jail_row['jail'] if top_jail_row else "N/A"
            
        return {
            "total_bans": total,
            "active_bans": active,
            "top_jail": top_jail
        }
        
    def get_timeline(self) -> List[Dict[str, Any]]:
        query = """
            SELECT 
                date(timeofban, 'unixepoch') as date_str,
                COUNT(*) as count
            FROM bans
            WHERE timeofban >= strftime('%s', 'now', '-7 days')
            GROUP BY date_str
            ORDER BY date_str ASC
        """
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(query)
            rows = cur.fetchall()
            
            import datetime
            counts_by_date = {row['date_str']: row['count'] for row in rows}
            
            timeline = []
            today = datetime.datetime.now(datetime.timezone.utc).date()
            for i in range(6, -1, -1):
                d = today - datetime.timedelta(days=i)
                date_str = d.isoformat()
                timeline.append({
                    "date": date_str,
                    "count": counts_by_date.get(date_str, 0)
                })
            return timeline
            
    def get_top_countries(self, limit: int = 5) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT DISTINCT ip FROM bans")
            rows = cur.fetchall()
            
            countries = []
            for row in rows:
                try:
                    geo = self.geo_svc.get_geo_data(row['ip'])
                    if geo and geo.get("country"):
                        countries.append(geo["country"])
                except Exception:
                    pass
            
            top = Counter(countries).most_common(limit)
            return [{"country": c[0], "count": c[1]} for c in top]
            
    def get_jails(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT name as jail, COUNT(*) as count FROM bans GROUP BY name ORDER BY count DESC")
            rows = cur.fetchall()
            return [{"jail": row['jail'], "count": row['count']} for row in rows]

    def get_active_jails(self) -> List[Dict[str, Any]]:
        now = int(time.time())
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(
                "SELECT name as jail, COUNT(*) as count FROM bans WHERE bantime < 0 OR (timeofban + bantime) > ? GROUP BY name ORDER BY count DESC",
                (now,)
            )
            rows = cur.fetchall()
            return [{"jail": row['jail'], "count": row['count']} for row in rows]
