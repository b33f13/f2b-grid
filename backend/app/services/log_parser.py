import re
import os
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple
from collections import defaultdict

# Matches: "2026-03-15 15:06:21,243 fail2ban.actions        [83070]: NOTICE  [ssh] Ban 1.2.3.4"
# Also matches:                                                                       "Restore Ban"
_BAN_RE = re.compile(
    r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+\s+fail2ban\.actions\s+\[\d+\]:\s+\w+\s+\[([^\]]+)\]\s+(?:Restore )?Ban\s+(\S+)',
    re.MULTILINE
)
# Matches: "[ssh] Unban 1.2.3.4"
_UNBAN_RE = re.compile(
    r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),\d+\s+fail2ban\.actions\s+\[\d+\]:\s+\w+\s+\[([^\]]+)\]\s+Unban\s+(\S+)',
    re.MULTILINE
)

_DATE_FMT = "%Y-%m-%d %H:%M:%S"


def _parse_ts(s: str) -> int:
    """Parse log timestamp string to a UTC unix epoch int."""
    try:
        dt = datetime.strptime(s, _DATE_FMT)
        # Assume log timestamps are in local time; treat as UTC for simplicity
        return int(dt.replace(tzinfo=timezone.utc).timestamp())
    except ValueError:
        return 0


class LogParserService:
    def __init__(self, log_path: str = "/app/logs/fail2ban.log"):
        self.log_path = log_path

    def _read_log(self) -> str:
        if not os.path.exists(self.log_path):
            return ""
        try:
            with open(self.log_path, "r", errors="replace") as f:
                return f.read()
        except OSError:
            return ""

    def get_history(
        self,
        limit: int = 100,
        offset: int = 0,
        active_only: bool = False,
        search: Optional[str] = None,
        jail: Optional[str] = None,
        sort_by: str = "timeofban",
        sort_desc: bool = True,
    ) -> Dict[str, Any]:
        content = self._read_log()
        now = int(time.time())

        # ---- collect ban events -------------------------------------------------
        # Store all bans: list of (ip, jail_name, ban_ts)
        bans: List[Tuple[str, str, int]] = []

        for m in _BAN_RE.finditer(content):
            ts_str, jail_name, ip = m.group(1), m.group(2), m.group(3)
            ts = _parse_ts(ts_str)
            bans.append((ip, jail_name, ts))

        # ---- collect unban events -----------------------------------------------
        # For each (ip, jail), keep a sorted list of unban timestamps
        unbans: Dict[Tuple[str, str], List[int]] = defaultdict(list)

        for m in _UNBAN_RE.finditer(content):
            ts_str, jail_name, ip = m.group(1), m.group(2), m.group(3)
            ts = _parse_ts(ts_str)
            unbans[(ip, jail_name)].append(ts)
            
        for u_list in unbans.values():
            u_list.sort()

        # ---- build entries -------------------------------------------------------
        entries = []
        for ip, jail_name, ban_ts in bans:
            # Find the first unban that happened *after* this ban
            u_list = unbans.get((ip, jail_name), [])
            unban_ts = next((u for u in u_list if u > ban_ts), None)
            
            # Determine active: no subsequent unban found yet
            if unban_ts:
                is_active = False
                banned_until = unban_ts
            else:
                is_active = True
                banned_until = None

            entries.append({
                "ip": ip,
                "jail": jail_name,
                "bannedAt": ban_ts,
                "unbannedAt": banned_until,
                "failCount": 0,
                "isActive": is_active,
                "protocol": "tcp",
                "port": None,
                "source": "log",
            })

        # ---- filter -------------------------------------------------------------
        if active_only:
            entries = [e for e in entries if e["isActive"]]
        if search:
            entries = [e for e in entries if search.lower() in e["ip"]]
        if jail:
            entries = [e for e in entries if e["jail"] == jail]

        total = len(entries)

        # ---- sort ---------------------------------------------------------------
        sort_key = {
            "timeofban": "bannedAt",
            "ip": "ip",
            "jail": "jail",
            "bancount": "failCount",
        }.get(sort_by, "bannedAt")

        entries.sort(key=lambda e: e[sort_key], reverse=sort_desc)

        return {
            "total": total,
            "items": entries[offset : offset + limit],
        }

    def get_log_stats(self) -> Dict[str, Any]:
        """Return basic stats directly from the log file (fast parsing)."""
        content = self._read_log()
        total_bans = 0
        for _ in _BAN_RE.finditer(content):
            total_bans += 1
        return {"total_bans": total_bans}

    def get_jails_from_log(self) -> List[Dict[str, Any]]:
        """Return jail list with counts from the log file."""
        content = self._read_log()
        counts: Dict[str, int] = defaultdict(int)
        seen: set = set()
        for m in _BAN_RE.finditer(content):
            jail_name, ip = m.group(2), m.group(3)
            key = (ip, jail_name)
            if key not in seen:
                seen.add(key)
                counts[jail_name] += 1
        return [{"jail": j, "count": c} for j, c in sorted(counts.items(), key=lambda x: -x[1])]
