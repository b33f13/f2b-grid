import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix typical react-leaflet icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// A custom neon marker
const neonIcon = new L.DivIcon({
  className: 'custom-neon-marker',
  html: `<div style="
    width: 12px;
    height: 12px;
    background: var(--color-danger);
    border-radius: 50%;
    box-shadow: 0 0 10px 2px var(--color-danger);
    animation: pulse 2s infinite;
  "></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

// CSS strictly for map animations inline or rely on cyberpunk.css
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 34, 68, 0.7); }
    70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(255, 34, 68, 0); }
    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 34, 68, 0); }
  .leaflet-container {
    background-color: var(--color-bg) !important;
    height: 100% !important;
    width: 100% !important;
  }
`;
document.head.appendChild(style);

interface BanLocation {
  ip: string;
  lat: number;
  lon: number;
  country: string;
  city: string;
  jail: string;
  failCount: number;
  unbannedAt: number;
}

interface CyberMapProps {
  data: BanLocation[];
  tracerouteData?: { targetIp: string; hops: any[] } | null;
}

export const CyberMap: React.FC<CyberMapProps> = ({ data, tracerouteData }) => {
  // Fix Leaflet tile loading bug inside flex containers
  React.useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  let polylinePositions: [number, number][] = [];
  let validHops: any[] = [];
  
  if (tracerouteData && tracerouteData.hops) {
    validHops = tracerouteData.hops.filter(hop => hop.lat !== undefined && hop.lon !== undefined && hop.ip !== '*');
    polylinePositions = validHops.map(hop => [hop.lat, hop.lon] as [number, number]);
    
    if (polylinePositions.length > 0) {
      const targetData = data.find(d => d.ip === tracerouteData.targetIp);
      if (targetData && targetData.lat !== undefined && targetData.lon !== undefined) {
        polylinePositions.push([targetData.lat, targetData.lon]);
      }
    }
  }

  return (
    <div className="absolute inset-0 z-0 border-neon rounded overflow-hidden bg-[var(--color-bg)]">
      <MapContainer
        center={[20, 30]}
        zoom={2}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {data.map((point) => (
          <Marker 
            key={point.ip} 
            position={[point.lat, point.lon]}
            icon={neonIcon}
          >
            <Popup className="cyber-popup">
              <div className="bg-[var(--color-surface)] text-white p-2 border border-[var(--color-border)] rounded-sm font-mono text-xs shadow-[0_0_10px_rgba(0,245,255,0.1)]">
                <div className="text-neon-cyan font-bold mb-1 border-b border-[var(--color-border)] pb-1">⚡ {point.ip}</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                  <span className="text-gray-400">LOC:</span><span>{point.country} · {point.city}</span>
                  <span className="text-gray-400">JAIL:</span><span className="text-neon-pink">{point.jail}</span>
                  <span className="text-gray-400">FAILS:</span><span className="text-neon-green">{point.failCount}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {polylinePositions.length > 1 && (
          <Polyline 
            positions={polylinePositions} 
            pathOptions={{ color: '#00f5ff', weight: 2, opacity: 0.8, dashArray: '5, 10' }} 
          />
        )}

        {(validHops)
          .map((hop, idx) => (
            <CircleMarker
              key={`trace-${idx}-${hop.hop}`}
              center={[hop.lat, hop.lon]}
              radius={4}
              pathOptions={{ fillColor: '#0a0a0f', color: '#00f5ff', weight: 2, fillOpacity: 1 }}
            >
              <Popup className="cyber-popup">
                <div className="bg-[var(--color-surface)] text-white p-2 border border-[var(--color-border)] rounded-sm font-mono text-xs shadow-[0_0_10px_rgba(0,245,255,0.1)]">
                  <div className="text-neon-cyan font-bold mb-1 border-b border-[var(--color-border)] pb-1">HOP {hop.hop}</div>
                  <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                    <span className="text-gray-400">IP:</span><span>{hop.ip}</span>
                    <span className="text-gray-400">LATENCY:</span><span className="text-neon-green">{hop.latency}</span>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
        ))}

      </MapContainer>
    </div>
  );
};
