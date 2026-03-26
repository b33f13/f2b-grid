import React, { useEffect, useState, useRef } from 'react';
import { Terminal, ShieldAlert } from 'lucide-react';

interface LogEvent {
  ip: string;
  jail: string;
  bannedAt: number;
}

export const LogFeed: React.FC = () => {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // We can simulate streaming of recent bans from the websocket or fetch it.
    // For now we will fetch the 20 most recent every 5 seconds.
    const fetchRecent = async () => {
      try {
        const res = await fetch('/api/v1/bans/history?limit=20&sort_by=timeofban&sort_desc=true');
        if (res.ok) {
          const js = await res.json();
          setLogs(js.items || []);
        }
      } catch (err) {
        console.error("LogFeed fetch error:", err);
      }
    };

    fetchRecent();
    const interval = setInterval(fetchRecent, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel h-full flex flex-col border-neon overflow-hidden">
      <div className="bg-[#1a2332] p-2 flex items-center justify-between border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2 text-xs font-mono text-neon-pink">
          <Terminal className="w-4 h-4" /> <span>LIVE_THREAT_FEED</span>
        </div>
        <div className="w-2 h-2 rounded-full bg-neon-pink animate-pulse"></div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-auto bg-[#0a0a0f] p-3 font-mono text-xs space-y-1 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="text-gray-600 animate-pulse">Awaiting events...</div>
        ) : (
          logs.map((log, i) => (
            <div key={`${log.ip}-${log.bannedAt}-${i}`} className="flex gap-2 text-gray-400 hover:bg-[#111620] p-1 rounded">
              <span className="text-gray-600">[{new Date(log.bannedAt * 1000).toLocaleTimeString()}]</span>
              <ShieldAlert className="w-3 h-3 text-[var(--color-danger)] mt-[1px]" />
              <span className="text-white w-28 truncate">{log.ip}</span>
              <span className="text-gray-500">::</span>
              <span className="text-neon-cyan truncate">{log.jail}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
