# 🛡️ F2B-GRID — Fail2Ban Cyberpunk Dashboard
### Vibecoding Roadmap & Entwicklungsprozess

```
███████╗██████╗ ██████╗      ██████╗ ██████╗ ██╗██████╗
██╔════╝╚════██╗██╔══██╗    ██╔════╝ ██╔══██╗██║██╔══██╗
█████╗   █████╔╝██████╔╝    ██║  ███╗██████╔╝██║██║  ██║
██╔══╝  ██╔═══╝ ██╔══██╗    ██║   ██║██╔══██╗██║██║  ██║
██║     ███████╗██████╔╝    ╚██████╔╝██║  ██║██║██████╔╝
╚═╝     ╚══════╝╚═════╝      ╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝
```

> *"Visualize the threat. Own the perimeter."*

---

## 📋 Projektübersicht

**F2B-GRID** ist ein lokales, terminal-inspiriertes Cyberpunk-Dashboard zur Echtzeit-Visualisierung
von Fail2Ban-Logs. Es zeigt gebannte IPs auf einer interaktiven Weltkarte, reichert sie mit
GeoIP- und WHOIS-Daten an und bietet Traceroute-Integration – alles in einem dunklen,
neongetränkten Interface.

| Eigenschaft     | Wert                                         |
|-----------------|----------------------------------------------|
| **Stack**       | Python (Backend) · React + TypeScript (Frontend) |
| **Styling**     | Tailwind CSS · Custom CSS Variables (Neon-Theme) |
| **Karte**       | Leaflet.js mit Dark-Tile-Layer (CartoDB Dark) |
| **Datenquelle** | Fail2Ban SQLite DB / Log-Parsing              |
| **Sicherheit**  | Localhost-only · Read-only Zugriff · Sandboxed |
| **Lizenz**      | MIT                                          |

---

## 🗺️ Phasen-Roadmap

### Phase 0 — Fundament & Architektur
> *Ziel: Solide, sichere Basis für alle weiteren Features*

- [ ] **Projektstruktur** anlegen (`/backend`, `/frontend`, `/data`, `/config`)
- [ ] **Backend-Grundgerüst** mit FastAPI (Python)
  - Nur `localhost:8080` binden (kein externes Netzwerk-Exposure)
  - API-Routen mit Versionierung: `/api/v1/...`
  - CORS strikt auf `localhost` beschränken
- [ ] **Frontend-Grundgerüst** mit Vite + React + TypeScript
- [ ] **Cyberpunk Design-System** definieren
  ```css
  --color-bg:        #0a0a0f;
  --color-surface:   #0d1117;
  --color-border:    #1a2332;
  --color-neon-cyan: #00f5ff;
  --color-neon-pink: #ff0080;
  --color-neon-green:#00ff41;
  --color-warning:   #ffaa00;
  --color-danger:    #ff2244;
  --font-mono:       'JetBrains Mono', 'Fira Code', monospace;
  ```
- [ ] **Docker Compose** Setup für isoliertes lokales Deployment
- [ ] README & Dokumentationsstruktur

**Deliverable:** Leeres Shell-Dashboard mit korrektem Theme, Routing läuft

---

### Phase 1 — Fail2Ban Log Integration
> *Ziel: Rohdaten sauber und sicher einlesen*

- [ ] **Log-Parser** implementieren
  - Fail2Ban SQLite-DB (`/var/lib/fail2ban/fail2ban.sqlite3`) auslesen
  - Fallback: `/var/log/fail2ban.log` Parsing via Regex
  - **Read-only** Datenbankzugriff (kein Write-Zugriff auf Systemdateien)
- [ ] **Datenmodell** definieren
  ```typescript
  interface BannedEntry {
    ip:          string;      // Gebannte IP
    jail:        string;      // z.B. "sshd", "nginx-http-auth"
    bannedAt:    Date;
    unbannedAt:  Date | null;
    failCount:   number;      // Anzahl fehlgeschlagener Versuche
    isActive:    boolean;     // Aktuell noch gebannt?
    protocol:    string;
    port:        number | null;
  }
  ```
- [ ] **REST-Endpunkte** implementieren
  - `GET /api/v1/bans` — alle Einträge (paginiert)
  - `GET /api/v1/bans/active` — aktuell aktive Bans
  - `GET /api/v1/stats` — Aggregierte Statistiken
  - `GET /api/v1/jails` — Liste aller Jails + Counts
- [ ] **Polling / WebSocket** für Live-Updates (5s Intervall)
- [ ] **Input-Validierung** aller API-Parameter (IP-Format, Paginierung)

**Deliverable:** API liefert echte Fail2Ban-Daten, abrufbar via curl

---

### Phase 2 — GeoIP & Kartenvisualisierung
> *Ziel: IPs auf der Weltkarte verorten – der visuelle Kern*

- [ ] **GeoIP-Integration**
  - MaxMind GeoLite2 DB (lokal, kein externer API-Call für Kerndaten)
  - Felder: Land, Stadt, Koordinaten, ASN, ISP-Name
  - Täglicher Update-Cron für die GeoIP-DB
- [ ] **Endpunkt:** `GET /api/v1/geo/{ip}` mit Rate-Limiting
- [ ] **Leaflet.js Karte** einbinden
  - Tile-Layer: `CartoDB.DarkMatter` (kein Google Maps, datenschutzfreundlich)
  - Custom Neon-Marker-Icons (Farbe nach Bedrohungslevel / Jail-Typ)
  - Marker-Clustering für dichte Regionen (Leaflet.markercluster)
- [ ] **Heatmap-Layer** für Angriffs-Intensität (Leaflet.heat)
- [ ] **Popup-Cards** bei Klick auf Marker
  ```
  ┌─────────────────────────────┐
  │ ⚡ 192.168.x.x              │
  │ 🌍 RU · Moscow · AS12345   │
  │ 🔒 Jail: sshd              │
  │ ❌ Fails: 47               │
  │ ⏱  Gebannt seit: 2h 13m   │
  │ [WHOIS] [TRACEROUTE]       │
  └─────────────────────────────┘
  ```
- [ ] **Live-Animations**: Neue Bans erscheinen mit Neon-Pulse-Effekt

**Deliverable:** Interaktive Weltkarte mit allen gebannten IPs

---

### Phase 3 — IP-Listen-Panel
> *Ziel: Detaillierte tabellarische Übersicht*

- [ ] **DataGrid-Komponente** (virtualisiert für Performance bei 10k+ Einträgen)
- [ ] **Spalten:**
  | Spalte       | Beschreibung                          |
  |--------------|---------------------------------------|
  | IP           | Adresse + Flagge + Kopier-Button      |
  | Land / ASN   | GeoIP-Daten                           |
  | Jail         | Farbkodierter Badge                   |
  | Fails        | Anzahl + Balken-Visualisierung        |
  | Erstkontakt  | Relativ-Zeit ("vor 3h")               |
  | Status       | AKTIV / EXPIRED + Countdown           |
  | Aktionen     | WHOIS · Traceroute · Details          |

- [ ] **Filter & Suche**
  - Nach Jail, Land, Status (aktiv/abgelaufen)
  - Freitext-Suche nach IP / ASN / Land
  - Zeitraum-Filter
- [ ] **Sortierung** nach allen Spalten
- [ ] **Export:** CSV-Download der gefilterten Ansicht
- [ ] **Paginierung** serverseitig (Cursor-basiert für Performance)

**Deliverable:** Vollständige IP-Liste mit Filter, Sort, Export

---

### Phase 4 — WHOIS Integration
> *Ziel: Detaillierte Registrierungsdaten zur IP*

- [ ] **WHOIS-Lookup** implementieren (Python `ipwhois`-Bibliothek)
  - Daten: Registrar, Organisation, Netzblock, Abuse-Kontakt, Land
  - **Caching:** TTL 24h in SQLite (WHOIS-Daten ändern sich selten)
  - **Rate-Limiting:** Max 1 Request/s an externe WHOIS-Server
- [ ] **Endpunkt:** `GET /api/v1/whois/{ip}`
  - IP-Format-Validierung (verhindert SSRF/Injection)
  - Privat-IPs & reservierte Ranges sofort ablehnen (RFC1918, etc.)
- [ ] **WHOIS-Modal** im Frontend
  ```
  ╔══════════════════════════════════════════╗
  ║  WHOIS  ░░  185.220.101.x               ║
  ╠══════════════════════════════════════════╣
  ║  Organisation:  Tor Project Inc.         ║
  ║  Netzblock:     185.220.100.0/22         ║
  ║  Registrar:     ARIN                     ║
  ║  Abuse-Mail:    abuse@torproject.org     ║
  ║  Land:          US                       ║
  ╚══════════════════════════════════════════╝
  ```
- [ ] Abuse-Kontakt als klickbarer `mailto:`-Link

**Deliverable:** WHOIS-Daten abrufbar und gecacht, sichere Validierung

---

### Phase 5 — Traceroute Integration
> *Ziel: Netzwerkpfad zur IP visualisieren*

- [ ] **Backend Traceroute-Wrapper**
  - `traceroute` / `tracepath` via subprocess (sandboxed)
  - **Sicherheit:**
    - Nur nicht-reservierte, öffentliche IPs erlaubt
    - Allowlist-Validierung vor Ausführung
    - Timeout: max 15 Sekunden
    - Kein Raw-Socket-Zugriff vom Frontend
  - Output-Parsing: Hop-Nummer, IP, RTT x3, Hostname
- [ ] **Endpunkt:** `POST /api/v1/traceroute` mit Body `{"ip": "..."}`
  - Job-Queue-Pattern: Start → `202 Accepted` + Job-ID → Poll Ergebnisse
- [ ] **Traceroute-Visualisierung** im Frontend
  - Hop-Liste mit RTT-Balken (Farbe: grün→gelb→rot nach Latenz)
  - Optionale Mini-Karte mit Route-Linie (GeoIP pro Hop)
  ```
  HOP  IP               RTT      HOST
  ─────────────────────────────────────────
   1   192.168.1.1       1ms     gateway.local
   2   10.0.0.1          8ms     isp-edge.de
   3   80.81.x.x        14ms     de-cix.net
   ...
  12   185.220.101.x    89ms     ████████ [TARGET]
  ```
- [ ] **Rate-Limiting:** Max 3 parallele Traceroutes

**Deliverable:** Interaktive Traceroute-Anzeige mit Hop-Visualisierung

---

### Phase 6 — Dashboard & Stats-Übersicht
> *Ziel: Zentrales Command-Center-Feeling*

- [ ] **Header-Bar** (immer sichtbar)
  - Hostname · Systemzeit · Live-Indikator (Puls-Animation)
  - Gesamt-Bans · Aktive Bans · Jails online
- [ ] **Stat-Cards** (Neon-Glow-Design)
  - Bans letzte 24h / 7 Tage / 30 Tage
  - Top-5 Herkunftsländer
  - Top-5 Jails nach Aktivität
  - Aktivste Tageszeit (Heatmap-Chart)
- [ ] **Timeline-Chart** (Recharts): Bans pro Stunde/Tag
- [ ] **Terminal-Log-Feed** (rechts): Echtzeit-Scroll der neuesten Events
  ```
  [02:14:33] BAN   ↑ 91.108.4.x    sshd      (attempts: 12)
  [02:14:31] BAN   ↑ 185.220.x.x   sshd      (attempts: 8)
  [02:13:55] UNBAN ↓ 45.33.x.x     nginx     (expired)
  ```
- [ ] **Layout:** Responsive Splitview (Karte links, Liste rechts, Stats oben)
- [ ] **Tastaturnavigation** für alle Panels (Vim-Keys: `j/k` navigieren)

**Deliverable:** Vollständiges Dashboard, alle Panels integriert

---

### Phase 7 — Sicherheit & Performance (Hardening)
> *Ziel: Produktionsreif und audit-sicher*

#### Sicherheit
- [ ] **Keine externe Netzwerk-Exposition** — ausschließlich `127.0.0.1`
- [ ] **Systemfile-Zugriff** nur read-only via dediziertem Service-Account
- [ ] **Input-Sanitierung** aller IP-Parameter (verhindert Command Injection)
- [ ] **SSRF-Schutz**: Privat-IP-Ranges vor externen Requests blocken
  ```python
  BLOCKED_RANGES = [
      "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
      "127.0.0.0/8", "169.254.0.0/16", "::1/128"
  ]
  ```
- [ ] **Rate-Limiting** auf allen API-Endpunkten (via `slowapi`)
- [ ] **Audit-Log** für alle externen Lookups (WHOIS, Traceroute)
- [ ] **Dependency-Pinning** mit `pip-audit` / `npm audit` in CI
- [ ] **CSP-Header** im Frontend: keine Inline-Scripts

#### Performance
- [ ] **GeoIP-Lookups gecacht** (In-Memory LRU, 10k Einträge)
- [ ] **WHOIS gecacht** in SQLite (TTL 24h)
- [ ] **DB-Queries** mit Indizes auf `ip`, `jail`, `timeofban`
- [ ] **Frontend-Bundle** < 300 KB gzipped (Code-Splitting)
- [ ] **Virtuelle Listen** für IP-Tabelle (react-virtual)
- [ ] **Lazy-Loading** der Karte (nicht im initialen Bundle)

**Deliverable:** Audit-Checkliste grün, Lighthouse Performance > 90

---

### Phase 8 — Polish & UX
> *Ziel: Das Ding sieht verdammt nochmal gut aus*

- [ ] **CRT-Scanline-Effekt** (CSS, optional deaktivierbar)
- [ ] **Boot-Sequenz-Animation** beim ersten Laden
  ```
  INITIALIZING F2B-GRID v1.0.0...
  [████████████████████] 100%
  LOADING THREAT INTELLIGENCE... OK
  CONNECTING TO FAIL2BAN... OK
  RENDERING GRID... OK
  ```
- [ ] **Glitch-Animationen** bei neuen Bans
- [ ] **Sound-Effekte** (optional, Web Audio API) bei neuen Bans
- [ ] **Dark/Darker Mode** Toggle (Cyan-Theme vs. Pink-Theme)
- [ ] **Fullscreen-Modus** für Monitoring-Screens
- [ ] **Keyboard-Shortcut-Overlay** (Taste `?`)

---

## 🏗️ Technische Architektur

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (localhost)                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │           React + TypeScript Frontend            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────────┐  │   │
│  │  │  Map     │ │  IPList  │ │  Stats/Charts   │  │   │
│  │  │ Leaflet  │ │ DataGrid │ │    Recharts     │  │   │
│  │  └──────────┘ └──────────┘ └─────────────────┘  │   │
│  │  ┌──────────────────────────────────────────┐    │   │
│  │  │        WebSocket  /  REST API Client     │    │   │
│  │  └──────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ localhost:8080
┌──────────────────────▼──────────────────────────────┐
│              FastAPI Backend (Python)                │
│  ┌────────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Log Parser │ │  GeoIP   │ │  WHOIS / Tracert │  │
│  │ (SQLite/  │ │ MaxMind  │ │  (sandboxed      │  │
│  │  LogFile) │ │ GeoLite2 │ │   subprocess)    │  │
│  └─────┬─────┘ └────┬─────┘ └────────┬─────────┘  │
│        └────────────┴────────────────┘             │
│  ┌─────────────────────────────────────────────┐   │
│  │           Cache Layer (SQLite + LRU)        │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ read-only
┌──────────────────────▼──────────────────────────────┐
│              System (read-only access)               │
│   /var/lib/fail2ban/fail2ban.sqlite3                 │
│   /var/log/fail2ban.log                              │
└──────────────────────────────────────────────────────┘
```

---

## 📁 Verzeichnisstruktur

```
f2b-grid/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI Entry Point
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── bans.py      # Ban-Endpunkte
│   │   │   │   ├── geo.py       # GeoIP-Endpunkte
│   │   │   │   ├── whois.py     # WHOIS-Endpunkte
│   │   │   │   └── traceroute.py
│   │   ├── core/
│   │   │   ├── config.py        # Settings (pydantic-settings)
│   │   │   ├── security.py      # IP-Validierung, SSRF-Schutz
│   │   │   └── limiter.py       # Rate-Limiter
│   │   ├── services/
│   │   │   ├── fail2ban.py      # Log-Parser & DB-Reader
│   │   │   ├── geoip.py         # MaxMind-Wrapper
│   │   │   ├── whois_service.py
│   │   │   └── traceroute.py
│   │   └── cache/
│   │       └── store.py         # LRU + SQLite Cache
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/             # Leaflet Kartenkomponente
│   │   │   ├── IPTable/         # Virtualisierte IP-Liste
│   │   │   ├── StatsPanel/      # Statistik-Cards
│   │   │   ├── WhoisModal/      # WHOIS-Overlay
│   │   │   ├── TraceroutePanel/ # Traceroute-Anzeige
│   │   │   └── LiveFeed/        # Terminal-Log-Feed
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useBans.ts
│   │   ├── styles/
│   │   │   └── cyberpunk.css    # Design-System-Variablen
│   │   └── App.tsx
│   ├── package.json
│   └── Dockerfile
│
├── data/
│   └── GeoLite2-City.mmdb       # MaxMind DB (gitignored)
│
├── docker-compose.yml
├── .env.example
├── ROADMAP.md
└── README.md
```

---

## 🔧 Technologie-Entscheidungen

| Bereich           | Gewählt            | Begründung                                      |
|-------------------|--------------------|-------------------------------------------------|
| Backend Framework | FastAPI            | Async, auto-docs, Pydantic-Validierung          |
| Karte             | Leaflet.js         | Open-Source, kein Google-Tracking, Dark-Tiles   |
| GeoIP             | MaxMind GeoLite2   | Lokal, kein API-Call, DSGVO-freundlich          |
| Charts            | Recharts           | React-native, tree-shakable, leichtgewichtig    |
| Styling           | Tailwind + CSS Vars| Utility-first + konsistentes Cyberpunk-Theme    |
| Cache             | SQLite + LRU       | Zero-Dependency, persistent + schnell           |
| WHOIS             | ipwhois (Python)   | Stabile Library, kein ext. API-Key nötig        |

---

## ⚡ Vibecoding-Prinzipien

> Dieses Projekt wird im **Vibecoding-Stil** entwickelt:
> iterativ, explorativ, mit KI-Unterstützung — aber niemals auf Kosten der Sicherheit.

1. **Sicherheit vor Eleganz** — Jeder externe Call wird validiert, jede IP geprüft
2. **Lokal zuerst** — Alle Daten verbleiben auf dem System, kein Cloud-Dependency
3. **Sichtbarer Fortschritt** — Jede Phase liefert einen lauffähigen, zeigbaren Stand
4. **Kein Over-Engineering** — Features erst wenn sie gebraucht werden (YAGNI)
5. **Das Auge scrollt mit** — UX und Aesthetik sind keine Extras, sondern Kernfeatures

---

## 🚀 Schnellstart (nach Phase 0)

```bash
# Repository klonen
git clone https://github.com/you/f2b-grid
cd f2b-grid

# GeoIP-DB herunterladen (MaxMind-Account erforderlich)
./scripts/update-geoip.sh

# Umgebungsvariablen konfigurieren
cp .env.example .env
# → F2B_DB_PATH=/var/lib/fail2ban/fail2ban.sqlite3

# Starten
docker compose up -d

# Dashboard öffnen
open http://localhost:3000
```

---

## 📊 Fortschritts-Tracker

| Phase | Name                  | Status      | Priorität |
|-------|-----------------------|-------------|-----------|
| 0     | Fundament             | ⬜ Offen    | 🔴 Kritisch |
| 1     | Log Integration       | ⬜ Offen    | 🔴 Kritisch |
| 2     | Karte & GeoIP         | ⬜ Offen    | 🔴 Kritisch |
| 3     | IP-Listen-Panel       | ⬜ Offen    | 🟠 Hoch    |
| 4     | WHOIS                 | ⬜ Offen    | 🟠 Hoch    |
| 5     | Traceroute            | ⬜ Offen    | 🟡 Mittel  |
| 6     | Dashboard/Stats       | ⬜ Offen    | 🟡 Mittel  |
| 7     | Security Hardening    | ⬜ Offen    | 🔴 Kritisch|
| 8     | Polish & UX           | ⬜ Offen    | 🟢 Nice2Have |

---

*Letzte Aktualisierung: 2026-03-13 · F2B-GRID Roadmap v1.0*
