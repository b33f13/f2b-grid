import sys
import os
import json
sys.path.insert(0, os.path.abspath('backend'))

from app.services.fail2ban import Fail2BanService
from app.services.log_parser import LogParserService

def run_tests():
    try:
        f2b_svc = Fail2BanService('data/fail2ban.sqlite3')
        
        print("--- Testing get_bans ---")
        bans = f2b_svc.get_bans(limit=2)
        print(f"Total bans found: {bans['total']}")
        print(f"First ban entry: {bans['items'][0] if bans['items'] else 'None'}")
        
        print("\n--- Testing get_timeline ---")
        timeline = f2b_svc.get_timeline()
        print(f"Timeline length: {len(timeline)}")
        print(json.dumps(timeline, indent=2))
        
        print("\n--- Testing get_active_jails ---")
        active_jails = f2b_svc.get_active_jails()
        print(f"Active jails found: {len(active_jails)}")
        print(json.dumps(active_jails, indent=2))
        
        print("\n--- Testing get_history from log_parser ---")
        # Check if fail2ban.log exists in data directory or somewhere else
        log_path = 'data/fail2ban.log'
        if not os.path.exists(log_path):
            log_path = 'backend/data/fail2ban.log' # ? wait
            
        log_svc = LogParserService(log_path) # Just testing logic, might be empty if path is wrong
        history = log_svc.get_history(limit=5)
        print(f"History items found: {len(history['items'])}")
        
        print("\n--- Testing get_log_stats ---")
        log_stats = log_svc.get_log_stats()
        print(f"Log Stats: {json.dumps(log_stats, indent=2)}")
        
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    run_tests()
