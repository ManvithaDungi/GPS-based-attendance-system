import React, { useEffect, useState } from 'react';
import { Map as MapIcon, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../lib/api';
import { NeumorphicCard } from '../components/common/NeumorphicCard';
import { cn } from '../lib/utils';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type Premise = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
};

export const Premises = () => {
  const [premises, setPremises] = useState<Premise[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPremises = async () => {
      try {
        const res = await api.get('/geofence/locations');
        const mappedData = (res.data.data ?? []).map((p: any) => ({
          id: p.id,
          name: p.name,
          lat: p.latitude,
          lng: p.longitude,
          radius: p.radiusMeters,
        }));

        setPremises(mappedData);
        setSelectedId(mappedData[0]?.id ?? null);
      } catch (err) {
        console.error('Error fetching premises', err);
        setError('Failed to load premises');
      } finally {
        setLoading(false);
      }
    };

    fetchPremises();
  }, []);

  const selectedPremise = premises.find((p) => p.id === selectedId) || premises[0];

  return (
    <div className="h-[calc(100vh-120px)] flex gap-8 animate-in zoom-in-95 duration-500">
      <div className="w-96 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-headline">Manage Premises</h2>
          <p className="text-slate-500 text-sm mt-1">Active geofence locations from the backend.</p>
        </div>

        <div className="space-y-4">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-24 w-full rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse"></div>
            ))
          ) : error ? (
            <NeumorphicCard className="p-6 text-center">
              <p className="font-bold text-danger">{error}</p>
            </NeumorphicCard>
          ) : premises.length === 0 ? (
            <NeumorphicCard className="p-6 text-center">
              <p className="font-bold text-slate-500">No active premises found</p>
            </NeumorphicCard>
          ) : premises.map((p) => (
            <NeumorphicCard
              key={p.id}
              onClick={() => setSelectedId(p.id)}
              className={cn(
                'p-4 cursor-pointer border-2 transition-all',
                selectedId === p.id ? 'border-primary' : 'border-transparent'
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  selectedId === p.id ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                )}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">{p.name}</h4>
                  <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <Navigation className="w-3 h-3" />
                    <span>{p.radius}m radius</span>
                  </div>
                </div>
              </div>
            </NeumorphicCard>
          ))}
        </div>

        {selectedPremise && (
          <NeumorphicCard className="p-6 mt-auto">
            <h5 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6 font-headline">Geofence Parameters</h5>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 font-bold">Latitude</span>
                <span className="text-slate-800 dark:text-slate-100 font-bold">{selectedPremise.lat}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 font-bold">Longitude</span>
                <span className="text-slate-800 dark:text-slate-100 font-bold">{selectedPremise.lng}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500 font-bold">Radius</span>
                <span className="text-slate-800 dark:text-slate-100 font-bold">{selectedPremise.radius}m</span>
              </div>
            </div>
          </NeumorphicCard>
        )}
      </div>

      <div className="flex-1 rounded-[2.5rem] overflow-hidden neumorphic-raised relative">
        {!loading && selectedPremise ? (
          <MapContainer center={[selectedPremise.lat, selectedPremise.lng]} zoom={18} className="w-full h-full" zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {premises.map((p) => (
              <React.Fragment key={p.id}>
                <Marker position={[p.lat, p.lng]}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-sm m-0">{p.name}</p>
                      <p className="text-xs text-slate-500 m-0">{p.radius}m radius</p>
                    </div>
                  </Popup>
                </Marker>
                <Circle
                  center={[p.lat, p.lng]}
                  radius={p.radius}
                  pathOptions={{
                    color: p.id === selectedId ? '#4F8EF7' : '#94A3B8',
                    fillColor: p.id === selectedId ? '#4F8EF7' : '#94A3B8',
                    fillOpacity: 0.1,
                  }}
                />
              </React.Fragment>
            ))}
          </MapContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
            {loading ? <RefreshCw className="w-12 h-12 text-primary animate-spin" /> : <MapIcon className="w-12 h-12 text-slate-300" />}
          </div>
        )}
      </div>
    </div>
  );
};
