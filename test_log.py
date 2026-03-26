from app.services.log_parser import LogParserService
open('data/test.log', 'w').write("""2026-03-25 15:06:21,243 fail2ban.actions        [83070]: NOTICE  [ssh] Ban 1.2.3.4
2026-03-25 16:06:21,243 fail2ban.actions        [83070]: NOTICE  [ssh] Unban 1.2.3.4
2026-03-25 17:06:21,243 fail2ban.actions        [83070]: NOTICE  [ssh] Ban 1.2.3.4
""")
svc = LogParserService('data/test.log')
res = svc.get_history(limit=5)
print([ (i['ip'], i['bannedAt'], i['unbannedAt'], i['isActive']) for i in res['items']])
