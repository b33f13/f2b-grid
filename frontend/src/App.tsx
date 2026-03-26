import { useEffect, useState } from 'react';
import './styles/cyberpunk.css';
import { CyberMap } from './components/Map/CyberMap';
import { IPTable } from './components/IPTable/IPTable';
import { StatCard } from './components/Dashboard/StatCard';
import { TimelineChart } from './components/Dashboard/TimelineChart';
import { TopCountriesChart } from './components/Dashboard/TopCountriesChart';
import { LogFeed } from './components/Dashboard/LogFeed';
import { ShieldAlert, Activity, Globe, Server } from 'lucide-react';

interface BanData {
  ip: string;
  jail: string;
  failCount: number;
  unbannedAt: number;
}

function App() {
  const [mapData, setMapData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_bans: 0, active_bans: 0, top_jail: 'N/A' });
  const [jailsCount, setJailsCount] = useState(0);
  const [activeJails, setActiveJails] = useState<{jail: string, count: number}[]>([]);
  const [tracerouteData, setTracerouteData] = useState<{ targetIp: string; hops: any[] } | null>(null);

  useEffect(() => {
    // Basic fetch on load
    const loadData = async () => {
      // Fetch History / Map Data independently
      try {
        const banRes = await fetch('/api/v1/bans/history?limit=100');
        if (banRes.ok) {
          const banDataObj = await banRes.json();
          const bans: BanData[] = banDataObj.items || [];
          const geoPromises = bans.map(async (ban) => {
            try {
              const geoRes = await fetch(`/api/v1/geo/${ban.ip}`);
              const geo = await geoRes.json();
              return { ...ban, ...geo };
            } catch { return ban; }
          });
          const fullData = await Promise.all(geoPromises);
          setMapData(fullData);
        }
      } catch (err) { console.error("Failed loading map data", err); }

      // Fetch Stats independently
      try {
        const statRes = await fetch('/api/v1/bans/stats');
        if (statRes.ok) {
          const statJs = await statRes.json();
          setStats(statJs);
        }
      } catch (err) { console.error("Failed loading stats", err); }

      // Fetch Jails Count independently
      try {
        const jailRes = await fetch('/api/v1/bans/history/jails');
        if (jailRes.ok) {
          const jailJs = await jailRes.json();
          setJailsCount(Object.keys(jailJs).length);
        }
      } catch (err) { console.error("Failed loading jails count", err); }

      // Fetch Active Jails independently
      try {
        const activeJailsRes = await fetch('/api/v1/bans/jails/active');
        if (activeJailsRes.ok) {
          const activeJailsJs = await activeJailsRes.json();
          setActiveJails(activeJailsJs);
        }
      } catch (err) { console.error("Failed loading active jails", err); }
    };
    loadData();
  }, []);

  return (
    <div className="crt h-screen w-screen overflow-hidden bg-[var(--color-bg)] text-white p-4 font-mono text-xs flex flex-col relative">
      <header className="border-neon px-2 py-2 mb-4 flex items-center bg-[#0a0a0f] bg-opacity-80 min-h-[60px] overflow-x-auto scrollbar-thin">
        {activeJails.length > 0 ? (
          <div className="flex gap-4 items-center">
            {activeJails.map((j) => (
              <div key={j.jail} className="min-w-[120px] bg-[var(--color-surface)] bg-opacity-50 px-3 py-1 rounded flex items-center justify-between border border-[var(--color-border)]">
                <span className="text-gray-400 text-xs font-bold uppercase truncate max-w-[100px]" title={j.jail}>{j.jail}</span>
                <span className="text-base font-bold text-red-400 ml-2">{j.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-xs italic">No active jails found...</div>
        )}
      </header>

      {/* Row 1: Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4 shrink-0">
        <StatCard title="TOTAL_THREATS_NEUTRALIZED" value={stats.total_bans.toLocaleString()} icon={ShieldAlert} colorClass="text-[#00f5ff]" />
        <StatCard title="ACTIVE_BANS_ENFORCED" value={stats.active_bans.toLocaleString()} icon={Activity} colorClass="text-[#ff00ff]" />
        <StatCard title="MOST_TARGETED_JAIL" value={stats.top_jail} icon={Server} colorClass="text-yellow-400" />
        <StatCard title="ACTIVE_JAILS_MONITORED" value={jailsCount.toString()} icon={Globe} colorClass="text-green-400" />
      </section>
      
      {/* Row 2: Map & IP Table */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="p-1 flex flex-col h-full border-neon rounded">
          <div className="bg-[var(--color-surface)] p-2 text-xs text-gray-400 border-b border-[var(--color-border)]">
            [ MAP_MODULE ] :: GLOBAL_THREAT_VIEW
          </div>
          <div className="flex-1 relative min-h-0">
            <CyberMap data={mapData} tracerouteData={tracerouteData} />
          </div>
        </div>
        
        <div className="panel flex flex-col items-center justify-center border-neon bg-[var(--color-surface)] bg-opacity-70 h-full overflow-hidden">
          <IPTable onTracerouteUpdate={setTracerouteData} />
        </div>
      </main>

      {/* Row 3: Analytics & LogFeed */}
      <section className="h-[45%] shrink-0 grid grid-cols-1 lg:grid-cols-3 gap-4 pb-2">
        <div className="col-span-1 border-neon bg-[var(--color-surface)] h-full overflow-hidden">
          <TimelineChart />
        </div>
        <div className="col-span-1 border-neon bg-[var(--color-surface)] h-full overflow-hidden">
          <TopCountriesChart />
        </div>
        <div className="col-span-1 border-neon bg-[var(--color-surface)] h-full overflow-hidden">
          <LogFeed />
        </div>
      </section>
    </div>
  )
}

export default App;
