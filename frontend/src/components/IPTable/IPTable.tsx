import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, Server, Download, ShieldAlert, ShieldCheck, Database, FileText } from 'lucide-react';
import { WhoisModal } from '../Modal/WhoisModal';


interface BannedEntry {
  ip: string;
  jail: string;
  bannedAt: number;
  unbannedAt: number | null;
  failCount: number;
  isActive: boolean;
}

const WhoisCell: React.FC<{ ip: string }> = ({ ip }) => {
  const [asn, setAsn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchWhois = async () => {
      try {
        const res = await fetch(`/api/v1/whois/${ip}`);
        if (res.ok && isMounted) {
          const js = await res.json();
          // use the ASN description or cidr, fallback to ASN
          let display = js.asn || 'Unknown';
          if (js.contacts && js.contacts.length > 0 && js.contacts[0].name) {
            display = js.contacts[0].name;
          }
          setAsn(display.length > 25 ? display.substring(0, 25) + '...' : display);
        }
      } catch {
        if (isMounted) setAsn('Error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchWhois();
    return () => { isMounted = false; };
  }, [ip]);

  if (loading) return <span className="text-gray-600 animate-pulse text-xs">resolving...</span>;
  return <span className="text-gray-400 text-xs truncate max-w-[150px]" title={asn || 'Unknown'}>{asn || 'Unknown'}</span>;
};

const GeoCell: React.FC<{ ip: string }> = ({ ip }) => {
  const [location, setLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchGeo = async () => {
      try {
        const res = await fetch(`/api/v1/geo/${ip}`);
        if (res.ok && isMounted) {
          const js = await res.json();
          const city = js.city || 'Unknown';
          const country = js.country || 'Unknown';
          setLocation(`${city}, ${country}`);
        }
      } catch {
        if (isMounted) setLocation('Error');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchGeo();
    return () => { isMounted = false; };
  }, [ip]);

  if (loading) return <span className="text-gray-600 animate-pulse text-xs">locating...</span>;
  return <span className="text-gray-400 text-xs truncate max-w-[150px]" title={location || 'Unknown'}>{location || 'Unknown'}</span>;
};

export const IPTable: React.FC<{ onTracerouteUpdate?: (data: { targetIp: string; hops: any[] } | null) => void }> = ({ onTracerouteUpdate }) => {
  const [data, setData] = useState<BannedEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [limit] = useState(15);
  const [source, setSource] = useState<'live' | 'history'>('history');
  
  // Filters
  const [search, setSearch] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [jail, setJail] = useState('');
  const [jailsList, setJailsList] = useState<{jail: string, count: number}[]>([]);
  const [selectedIp, setSelectedIp] = useState<string | null>(null);

  const fetchBans = async () => {
    try {
      const offset = page * limit;
      const basePath = source === 'history' ? '/api/v1/bans/history' : '/api/v1/bans';
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        active_only: activeOnly.toString(),
      });
      if (search) params.append('search', search);
      if (jail) params.append('jail', jail);

      const res = await fetch(`${basePath}?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.items || []);
        setTotal(json.total || 0);
      }
    } catch (e) {
      console.error("Failed fetching bans list", e);
    }
  };

  const fetchJails = async () => {
    try {
      const jailsPath = source === 'history' ? '/api/v1/bans/history/jails' : '/api/v1/bans/jails';
      const res = await fetch(jailsPath);
      if (res.ok) {
        const json = await res.json();
        setJailsList(json);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setPage(0);
    setJail('');
    fetchJails();
  }, [source]);

  useEffect(() => {
    fetchJails();
  }, []);

  useEffect(() => {
    fetchBans();
  }, [page, activeOnly, search, jail, source]);


  const handleExport = () => {
    const params = new URLSearchParams({ active_only: activeOnly.toString() });
    if (search) params.append('search', search);
    if (jail) params.append('jail', jail);
    
    window.open(`/api/v1/bans/export?${params.toString()}`, '_blank');
  };

  return (
    <div className="panel flex flex-col h-full border-neon overflow-hidden">
      {/* Toolbar */}
      <div className="bg-[var(--color-surface)] p-3 border-b border-[var(--color-border)] flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">

          {/* Source toggle */}
          <div className="flex rounded overflow-hidden border border-[var(--color-border)]">
            <button
              onClick={() => setSource('live')}
              className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${source === 'live' ? 'bg-neon-cyan text-black font-bold' : 'bg-[#0a0a0f] text-gray-400 hover:text-white'}`}
            >
              <Database className="w-3 h-3" /> Live
            </button>
            <button
              onClick={() => setSource('history')}
              className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${source === 'history' ? 'bg-neon-cyan text-black font-bold' : 'bg-[#0a0a0f] text-gray-400 hover:text-white'}`}
            >
              <FileText className="w-3 h-3" /> Historical
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              placeholder="Search IP..."
              className="bg-[#0a0a0f] border border-[var(--color-border)] rounded px-8 py-1 text-sm text-neon-cyan focus:outline-none focus:border-neon-cyan w-48"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
            />
          </div>
          
          <select 
            className="bg-[#0a0a0f] border border-[var(--color-border)] rounded px-2 py-1 text-sm text-white focus:outline-none"
            value={jail}
            onChange={e => { setJail(e.target.value); setPage(0); }}
          >
            <option value="">All Jails</option>
            {jailsList.map(j => (
              <option key={j.jail} value={j.jail}>{j.jail} ({j.count})</option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 hover:text-white">
            <input 
              type="checkbox" 
              className="accent-neon-pink"
              checked={activeOnly}
              onChange={e => { setActiveOnly(e.target.checked); setPage(0); }}
            />
            Active Only
          </label>
        </div>

        <button 
          onClick={handleExport}
          className="flex items-center gap-2 bg-[#1a2332] hover:bg-[#253247] px-3 py-1 rounded text-sm transition-colors border border-transparent hover:border-gray-500"
        >
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        <table className="w-full text-left border-collapse text-xs table-fixed">
          <thead className="bg-[#0f141d] sticky top-0 z-10 text-gray-400 shadow-md">
            <tr>
              <th className="py-2 px-2 font-normal w-[18%]">Target IP</th>
              <th className="py-2 px-2 font-normal w-[22%]">Location</th>
              <th className="py-2 px-2 font-normal w-[25%]">ISP / Network</th>
              <th className="py-2 px-2 font-normal w-[15%]">Jail</th>
              <th className="py-2 px-2 font-normal w-[5%]">Fails</th>
              <th className="py-2 px-2 font-normal w-[10%]">Banned</th>
              <th className="py-2 px-2 font-normal w-[5%]">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr 
                key={`${row.ip}-${row.bannedAt}`} 
                className="border-b border-[#1a2332] hover:bg-[#111620] transition-colors cursor-pointer"
                onClick={() => setSelectedIp(row.ip)}
              >
                <td className="py-2 px-2 font-mono text-neon-cyan flex items-center gap-1 truncate" title={row.ip}>
                  <Server className="w-3 h-3 text-gray-500 shrink-0" />
                  <span className="hover:underline truncate">{row.ip}</span>
                </td>
                <td className="py-2 px-2 truncate">
                  <GeoCell ip={row.ip} />
                </td>
                <td className="py-2 px-2 truncate">
                  <WhoisCell ip={row.ip} />
                </td>
                <td className="py-2 px-2 truncate" title={row.jail}>
                  <span className="bg-[#1a2332] text-[10px] px-1 py-0.5 rounded text-neon-pink truncate">{row.jail}</span>
                </td>
                <td className="py-2 px-2 text-neon-green truncate">{row.failCount}</td>
                <td className="py-2 px-2 text-gray-400 text-[10px] truncate" title={formatDistanceToNow(new Date(row.bannedAt * 1000), { addSuffix: true })}>
                  {formatDistanceToNow(new Date(row.bannedAt * 1000), { addSuffix: true })}
                </td>
                <td className="py-2 px-2 truncate">
                  {row.isActive ? (
                    <span className="flex items-center gap-1 text-danger animate-pulse truncate"><ShieldAlert className="w-3 h-3 text-[var(--color-danger)] shrink-0" /> <span className="hidden xl:inline">Active</span></span>
                  ) : (
                    <span className="flex items-center gap-1 text-gray-500 truncate"><ShieldCheck className="w-3 h-3 shrink-0" /> <span className="hidden xl:inline">Expired</span></span>
                  )}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-500">No matching threat records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="bg-[#0f141d] p-2 border-t border-[var(--color-border)] flex justify-between items-center text-xs text-gray-400">
        <div>Showing {page * limit + 1} - {Math.min((page + 1) * limit, total)} of <span className="text-white">{total}</span> limits</div>
        <div className="flex gap-2">
          <button 
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="px-2 py-1 bg-[#1a2332] rounded hover:bg-[#253247] disabled:opacity-50 disabled:cursor-not-allowed text-white"
          >
            Prev
          </button>
          <button 
            disabled={(page + 1) * limit >= total}
            onClick={() => setPage(p => p + 1)}
            className="px-2 py-1 bg-[#1a2332] rounded hover:bg-[#253247] disabled:opacity-50 disabled:cursor-not-allowed text-white"
          >
            Next
          </button>
        </div>
      </div>

      <WhoisModal ip={selectedIp} onClose={() => setSelectedIp(null)} onTracerouteUpdate={onTracerouteUpdate} />
    </div>
  );
};
