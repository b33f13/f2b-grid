import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Globe } from 'lucide-react';

interface CountryData {
  country: string;
  count: number;
}

export const TopCountriesChart: React.FC = () => {
  const [data, setData] = useState<CountryData[]>([]);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch('/api/v1/bans/stats/countries');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Top countries error:", err);
      }
    };
    fetchCountries();
    const interval = setInterval(fetchCountries, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="panel h-full flex flex-col border-neon overflow-hidden">
      <div className="bg-[var(--color-surface)] p-2 text-[10px] md:text-xs text-gray-400 border-b border-[var(--color-border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-neon-pink" />
          <span>[ ANALYTICS ] :: TOP_ORIGIN_VECTORS</span>
        </div>
      </div>
      <div className="flex-1 p-4 bg-[#0a0a0f] min-h-0">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2332" horizontal={true} vertical={false} />
              <XAxis type="number" stroke="#4b5563" fontSize={10} tickMargin={5} allowDecimals={false} hide={true} />
              <YAxis dataKey="country" type="category" stroke="#4b5563" fontSize={10} tickMargin={5} width={30} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(255, 0, 128, 0.1)' }}
                contentStyle={{ backgroundColor: '#111620', borderColor: '#ff0080', borderRadius: '4px', fontFamily: 'monospace', fontSize: '10px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(val: any) => [val || 0, 'Bans']}
                labelStyle={{ color: '#9ca3af', marginBottom: '2px' }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#ff0080' : '#c026d3'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center font-mono text-[10px] text-gray-600 animate-pulse">
            Analyzing origin vectors...
          </div>
        )}
      </div>
    </div>
  );
};
