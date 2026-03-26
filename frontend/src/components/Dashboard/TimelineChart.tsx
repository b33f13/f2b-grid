import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity } from 'lucide-react';

interface TimelineData {
  date: string;
  count: number;
}

export const TimelineChart: React.FC = () => {
  const [data, setData] = useState<TimelineData[]>([]);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const res = await fetch('/api/v1/bans/stats/timeline');
        if (res.ok) {
          const json = await res.json();
          // Map ISO dates to MM/DD
          const formatted = json.map((d: any) => {
            const dateObj = new Date(d.date);
            return {
              ...d,
              displayDate: `${dateObj.getMonth() + 1}/${dateObj.getDate()}`
            };
          });
          setData(formatted);
        }
      } catch (err) {
        console.error("Timeline chart error:", err);
      }
    };
    fetchTimeline();
    const interval = setInterval(fetchTimeline, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel h-full flex flex-col border-neon overflow-hidden">
      <div className="bg-[var(--color-surface)] p-2 text-xs text-gray-400 border-b border-[var(--color-border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-neon-cyan" />
          <span>[ ANALYTICS ] :: 7-DAY_BAN_TREND</span>
        </div>
      </div>
      <div className="flex-1 p-4 bg-[#0a0a0f]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00f5ff" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#00f5ff" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" vertical={false} />
              <XAxis dataKey="displayDate" stroke="#4b5563" fontSize={11} tickMargin={8} />
              <YAxis stroke="#4b5563" fontSize={11} tickMargin={8} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111620', borderColor: '#00f5ff', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(val: any) => [val || 0, 'Bans']}
                labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
              />
              <Area type="monotone" dataKey="count" stroke="#00f5ff" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center font-mono text-xs text-gray-600 animate-pulse">
            Compiling historical data...
          </div>
        )}
      </div>
    </div>
  );
};
