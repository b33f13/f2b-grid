import time
import random
import sqlite3
import datetime

# Dummy realistic data
JAILS = ["sshd", "nginx-http-auth", "nginx-botsearch", "postfix"]
COUNTRIES = ["RU", "CN", "US", "DE", "BR", "IN", "TR", "GB"]
PROTOCOLS = ["tcp", "udp"]

DB_PATH = "data/fail2ban.sqlite3"
LOG_PATH = "data/fail2ban.log"

def create_schema(cursor):
    # Based roughly on real fail2ban v0.11 SQLite DB schema
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bans (
            name TEXT, 
            ip TEXT, 
            timeofban INTEGER, 
            bantime INTEGER, 
            bancount INTEGER,
            data JSON
        )
    """)
    # A simplified jobs/failures table for additional stats if needed
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS failures (
            name TEXT, 
            ip TEXT, 
            timeoffailure INTEGER, 
            timeofban INTEGER,
            failures INTEGER
        )
    """)

def generate_ip():
    return f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"

def populate_mock_data(cursor, num_bans=1000):
    now = int(time.time())
    log_entries = []
    
    for _ in range(num_bans):
        jail = random.choice(JAILS)
        ip = generate_ip()
        
        # some bans are active, some are expired
        # 30% chance ban is actively active (banned in last 24 hours, bantime 86400)
        is_active = random.random() < 0.3
        timeofban = now - random.randint(10, 80000) if is_active else now - random.randint(100000, 5000000)
        bantime = 86400 * random.choice([1, 7, 30]) if is_active else 86400
            
        bancount = random.randint(1, 15)
        
        cursor.execute(
            "INSERT INTO bans (name, ip, timeofban, bantime, bancount) VALUES (?, ?, ?, ?, ?)",
            (jail, ip, timeofban, bantime, bancount)
        )
        
        failures = random.randint(5, int(bancount * 10))
        cursor.execute(
            "INSERT INTO failures (name, ip, timeoffailure, timeofban, failures) VALUES (?, ?, ?, ?, ?)",
            (jail, ip, timeofban - random.randint(10, 1000), timeofban, failures)
        )

        # Writing to mock log list
        ts_str = datetime.datetime.fromtimestamp(timeofban).strftime('%Y-%m-%d %H:%M:%S,%f')[:23]
        log_entries.append((timeofban, f"{ts_str} fail2ban.actions        [83070]: NOTICE  [{jail}] Ban {ip}\n"))
        if not is_active:
            unban_ts = timeofban + bantime
            unban_str = datetime.datetime.fromtimestamp(unban_ts).strftime('%Y-%m-%d %H:%M:%S,%f')[:23]
            log_entries.append((unban_ts, f"{unban_str} fail2ban.actions        [83070]: NOTICE  [{jail}] Unban {ip}\n"))

    # Write log file sequentially sorted by timestamp
    log_entries.sort(key=lambda x: x[0])
    with open(LOG_PATH, "w") as f:
        for _, log_line in log_entries:
            f.write(log_line)

def main():
    print(f"Generating mock data in {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS bans")
    cur.execute("DROP TABLE IF EXISTS failures")
    create_schema(cur)
    populate_mock_data(cur, 450)
    conn.commit()
    conn.close()
    print("Mock data generated successfully!")

if __name__ == "__main__":
    main()
