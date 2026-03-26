import React, { useState, useEffect } from 'react';
import { X, Network, User, Activity, ChevronRight } from 'lucide-react';

interface Contact {
  name?: string;
  emails: string[];
  roles: string[];
}

interface WhoisData {
  ip: string;
  asn?: string;
  cidr?: string;
  contacts: Contact[];
  error?: string;
}

interface TracerouteHop {
  hop: number;
  ip: string;
  latency: string;
  lat?: number;
  lon?: number;
}

interface WhoisModalProps {
  ip: string | null;
  onClose: () => void;
  onTracerouteUpdate?: (data: { targetIp: string; hops: TracerouteHop[] } | null) => void;
}

export const WhoisModal: React.FC<WhoisModalProps> = ({ ip, onClose, onTracerouteUpdate }) => {
  const [activeTab, setActiveTab] = useState<'whois' | 'traceroute'>('whois');
  
  const [whoisData, setWhoisData] = useState<WhoisData | null>(null);
  const [whoisLoading, setWhoisLoading] = useState(false);

  const [traceData, setTraceData] = useState<TracerouteHop[] | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);

  // Reset tab on new IP
  useEffect(() => {
    setActiveTab('whois');
    if (!ip) {
      onTracerouteUpdate?.(null);
      setTraceData(null);
      setTraceError(null);
    }
  }, [ip, onTracerouteUpdate]);

  useEffect(() => {
    if (!ip || activeTab !== 'whois') return;
    
    let isMounted = true;
    if (!whoisData) {
      setWhoisLoading(true);
      const fetchWhois = async () => {
        try {
          const res = await fetch(`/api/v1/whois/${ip}`);
          if (res.ok) {
            const json = await res.json();
            if (isMounted) setWhoisData(json);
          }
        } catch (err) {
          if (isMounted) setWhoisData({ ip, error: "Network Error contacting WHOIS backend." } as WhoisData);
        } finally {
          if (isMounted) setWhoisLoading(false);
        }
      };
      fetchWhois();
    }
    return () => { isMounted = false; };
  }, [ip, activeTab, whoisData]);

  useEffect(() => {
    if (!ip || activeTab !== 'traceroute') return;
    
    let isMounted = true;
    if (!traceData && !traceError) {
      setTraceLoading(true);
      const fetchTrace = async () => {
        try {
          const res = await fetch(`/api/v1/traceroute/${ip}`);
          if (res.ok) {
            const json = await res.json();
            if (isMounted) {
              if (json.error) setTraceError(json.error);
              else {
                setTraceData(json.hops || []);
                onTracerouteUpdate?.({ targetIp: ip, hops: json.hops || [] });
              }
            }
          }
        } catch (err) {
          if (isMounted) setTraceError("Network Error executing Traceroute.");
        } finally {
          if (isMounted) setTraceLoading(false);
        }
      };
      fetchTrace();
    }
    return () => { isMounted = false; };
  }, [ip, activeTab, traceData, traceError]);

  if (!ip) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black bg-opacity-80 p-4">
      <div className="bg-[#0a0a0f] border border-neon rounded-lg shadow-[0_0_30px_rgba(0,245,255,0.2)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Terminal Header */}
        <div className="bg-[#1a2332] p-2 flex justify-between items-center border-b border-[var(--color-border)]">
          <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
            <div className="flex items-center gap-2 border-r border-gray-700 pr-4">
              <span className="text-neon-cyan animate-pulse">▶</span> 
              <span>INTEL_INTERFACE</span>
              <span className="text-neon-pink">::{ip}</span>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setActiveTab('whois')}
                className={`px-3 py-1 rounded transition-colors ${activeTab === 'whois' ? 'bg-[#253247] text-white' : 'hover:bg-[#1a2332]'}`}
              >
                WHOIS
              </button>
              <button 
                onClick={() => setActiveTab('traceroute')}
                className={`px-3 py-1 rounded transition-colors ${activeTab === 'traceroute' ? 'bg-[#253247] text-white' : 'hover:bg-[#1a2332]'}`}
              >
                TRACEROUTE
              </button>
            </div>
          </div>
          <button 
            onClick={() => { onClose(); onTracerouteUpdate?.(null); }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Terminal Body */}
        <div className="p-6 font-mono text-sm overflow-y-auto flex-1 custom-scrollbar min-h-[300px]">
          {activeTab === 'whois' && (
            <>
              {whoisLoading ? (
                <div className="text-neon-green animate-pulse flex flex-col gap-2">
                  <p>Initializing connection to RDAP registry...</p>
                  <p>Querying {ip}...</p>
                  <div className="flex gap-1 mt-4">
                    <div className="w-2 h-4 bg-neon-green animate-bounce"></div>
                    <div className="w-2 h-4 bg-neon-green animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-4 bg-neon-green animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              ) : whoisData?.error ? (
                <div className="text-[var(--color-danger)] border border-[var(--color-danger)] p-4 rounded bg-red-900 bg-opacity-20">
                  <p><strong>[ ERROR ]</strong> WHOIS lookup failed.</p>
                  <p className="mt-2 text-xs opacity-80">{whoisData.error}</p>
                </div>
              ) : whoisData ? (
                <div className="text-gray-300 space-y-6 animate-fade-in">
                  {/* Network Info */}
                  <div>
                    <h3 className="text-neon-cyan border-b border-[#1a2332] pb-1 mb-3 flex items-center gap-2">
                      <Network className="w-4 h-4" /> NETWORK INFRASTRUCTURE
                    </h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <span className="text-gray-500">IP ADDRESS:</span>
                      <span className="text-white">{whoisData.ip}</span>
                      
                      <span className="text-gray-500">ASN:</span>
                      <span className="text-neon-pink">{whoisData.asn || 'UNKNOWN'}</span>
                      
                      <span className="text-gray-500">ROUTING (CIDR):</span>
                      <span className="text-neon-green">{whoisData.cidr || 'UNKNOWN'}</span>
                    </div>
                  </div>

                  {/* Contacts */}
                  <div>
                    <h3 className="text-neon-cyan border-b border-[#1a2332] pb-1 mb-3 flex items-center gap-2">
                      <User className="w-4 h-4" /> REGISTRY CONTACTS
                    </h3>
                    {whoisData.contacts.length > 0 ? (
                      <div className="space-y-4">
                        {whoisData.contacts.map((contact, idx) => (
                          <div key={idx} className="bg-[#111620] p-3 rounded border border-[#1a2332]">
                            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                              <span className="text-gray-500">ENTITY:</span>
                              <span className="text-white">{contact.name || 'REDACTED'}</span>
                              
                              <span className="text-gray-500">ROLES:</span>
                              <span className="text-gray-400">{contact.roles.join(', ') || 'N/A'}</span>
                              
                              <span className="text-gray-500">EMAIL(S):</span>
                              <span className="text-blue-400">
                                {contact.emails.length > 0 ? contact.emails.join(', ') : 'NONE PROVIDED'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs italic">No structured contact data found in RDAP response.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </>
          )}

          {activeTab === 'traceroute' && (
            <>
              {traceLoading ? (
                <div className="text-neon-cyan animate-pulse flex flex-col gap-2">
                  <p>Spawning async traceroute subprocess...</p>
                  <p>Tracing path to {ip} (max 20 hops)...</p>
                  <div className="mt-4 flex flex-col gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-4 opacity-50">
                        <span className="text-gray-500 w-6">{i}</span>
                        <span className="w-32 bg-[#1a2332] h-4 rounded"></span>
                        <span className="w-16 bg-[#1a2332] h-4 rounded"></span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : traceError ? (
                <div className="text-[var(--color-danger)] border border-[var(--color-danger)] p-4 rounded bg-red-900 bg-opacity-20">
                  <p><strong>[ ERROR ]</strong> Traceroute execution failed.</p>
                  <p className="mt-2 text-xs opacity-80">{traceError}</p>
                </div>
              ) : traceData ? (
                <div className="text-gray-300 animate-fade-in">
                  <h3 className="text-neon-cyan border-b border-[#1a2332] pb-1 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> TRACEROUTE HOPS
                  </h3>
                  
                  {traceData.length > 0 ? (
                    <div className="space-y-2 relative">
                      {/* Vertical connecting line */}
                      <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-gray-800 z-0"></div>
                      
                      {traceData.map((hop, idx) => {
                        const isTimeout = hop.ip === '*';
                        const isTarget = hop.ip === ip;
                        
                        return (
                          <div key={idx} className="flex items-center gap-4 relative z-10 group">
                            {/* Node Point */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 
                              ${isTarget ? 'bg-neon-pink border-neon-pink text-black shadow-[0_0_10px_#ff2a5f]' : 
                                isTimeout ? 'bg-[#0a0a0f] border-gray-600 text-gray-600' : 
                                'bg-[#0a0a0f] border-neon-cyan text-neon-cyan group-hover:bg-neon-cyan group-hover:text-black transition-colors'}`}
                            >
                              {hop.hop}
                            </div>
                            
                            <ChevronRight className="w-3 h-3 text-gray-700" />
                            
                            {/* Hop Info */}
                            <div className={`flex-1 w-full flex justify-between items-center p-2 rounded border transition-colors
                              ${isTarget ? 'bg-[#ff2a5f1a] border-neon-pink' : 
                                isTimeout ? 'border-transparent text-gray-600' : 
                                'border-[#1a2332] bg-[#111620] group-hover:border-neon-cyan'}`}
                            >
                              <span className={`font-bold ${isTimeout ? '' : 'text-white'}`}>
                                {hop.ip} 
                                {isTarget && <span className="ml-2 text-neon-pink text-[10px] uppercase">(Target Reached)</span>}
                              </span>
                              <span className={`${isTimeout ? '' : 'text-neon-green'}`}>{hop.latency}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500">No hops recorded / Subprocess output empty.</p>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
