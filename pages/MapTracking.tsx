import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup, Polyline } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Eye } from 'lucide-react';

const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: iconUrl,
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export const MapTracking: React.FC = () => {
  const [position, setPosition] = useState<LatLngExpression>([14.5995, 120.9842]);
  const [historyPath, setHistoryPath] = useState<LatLngExpression[]>([]);
  const [address, setAddress] = useState("Northridge Academy, Baguio City");

  const safeZone = {
    center: [14.6050, 120.9900] as LatLngExpression,
    radius: 300
  };

  useEffect(() => {
    const locations = ["Taft Avenue, Moving North", "United Nations Ave, Stopped", "Kalaw Avenue, 5km/h"];
    let i = 0;

    const interval = setInterval(() => {
      setPosition((prev: any) => {
        const newLat = prev[0] + (Math.random() - 0.5) * 0.001;
        const newLng = prev[1] + (Math.random() - 0.5) * 0.001;
        const newPos: LatLngExpression = [newLat, newLng];
        setHistoryPath(current => [...current, newPos]);
        return newPos;
      });
      setAddress(locations[i % locations.length]);
      i++;
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full w-full relative">

      {/* Map Layer */}
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={position}>
          <Popup>Irene is here</Popup>
        </Marker>
        <Polyline positions={historyPath} color="blue" dashArray="5, 10" opacity={0.6} />
        <Circle center={safeZone.center} radius={safeZone.radius} pathOptions={{ color: 'green', fillColor: 'green', fillOpacity: 0.1 }} />
      </MapContainer>

      {/* Top Overlay Status */}
      <div className="absolute top-6 left-4 right-4 z-[400]">
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-slate-100">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 mt-2 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live Tracking Active</h3>
              <p className="text-xs text-slate-500 mt-1">Updates every 30s. Battery optimized.</p>
              <p className="text-xs font-medium text-slate-700 mt-2 flex items-center gap-1">
                <MapPin size={12} />
                {address}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Overlay Actions */}
      <div className="absolute bottom-6 left-4 right-4 z-[400] flex gap-3">
        <button className="flex-1 bg-white p-3 rounded-xl shadow-lg border border-slate-100 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 active:scale-95 transition-transform">
          <Navigation size={16} className="text-blue-600" /> Get Directions
        </button>
        <button className="flex-1 bg-white p-3 rounded-xl shadow-lg border border-slate-100 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700 active:scale-95 transition-transform">
          <Eye size={16} className="text-slate-500" /> Street View
        </button>
      </div>
    </div>
  );
};