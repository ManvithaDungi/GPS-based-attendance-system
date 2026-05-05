import React, { useEffect, useState } from 'react';
import { 
  MapPin, 
  Map as MapIcon, 
  Plus, 
  Clock, 
  Navigation, 
  Maximize2 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../lib/api';
import { NeumorphicCard } from '../components/common/NeumorphicCard';
import { cn } from '../lib/utils';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export const Premises = () => {
  const [premises, setPremises] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPremises = async () => {
      try {
        const res = await api.get('/admin/config');
        const mappedData = res.data.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          lat: p.latitude,
          lng: p.longitude,
          radius: p.radiusMeters,
          hours: p.workingHours ? `${p.workingHours.startTime} - ${p.workingHours.endTime}` : '09:00 - 17:00',
          lateThreshold: p.workingHours ? `+${p.workingHours.lateThresholdMins}m` : '09:15',
        }));
        setPremises(mappedData);
      } catch (err) {
        console.error('Error fetching premises', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPremises();
  }, []);

  const selectedPremise = premises.find(p => p.id === selectedId) || premises[0];

  return (
    <div className="h-[calc(100vh-120px)] flex gap-8 animate-in zoom-in-95 duration-500">
      {/* Left Panel - List & Form */}
      <div className="w-96 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-headline">Manage Premises</h2>
          <button className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all">
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-4">
          {loading ? (
             Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-24 w-full rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse"></div>
             ))
          ) : premises.map((p) => (
            <NeumorphicCard 
              key={p.id} 
              onClick={() => setSelectedId(p.id)}
              className={cn(
                "p-4 cursor-pointer border-2 transition-all",
                selectedId === p.id ? "border-primary" : "border-transparent"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  selectedId === p.id ? "bg-primary/20 text-primary" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                )}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100">{p.name}</h4>
                  <div className="flex items-center gap-4 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.hours.split(' - ')[0]}</span>
                    <span className="flex items-center gap-1"><Navigation className="w-3 h-3" /> {p.radius}m</span>
                  </div>
                </div>
              </div>
            </NeumorphicCard>
          ))}
        </div>

        {selectedPremise && (
          <NeumorphicCard className="p-6 mt-auto">
            <h5 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-6 font-headline">Geofence Parameters</h5>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 ml-2">Premise Name</label>
                <input 
                  type="text" 
                  value={selectedPremise.name} 
                  className="w-full bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-100"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 ml-2">Radius (m)</label>
                  <input 
                    type="number" 
                    value={selectedPremise.radius} 
                    className="w-full bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-100"
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 ml-2">Threshold</label>
                  <input 
                    type="text" 
                    value={selectedPremise.lateThreshold} 
                    className="w-full bg-bg-light dark:bg-bg-dark neumorphic-inset border-none rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-100"
                    readOnly
                  />
                </div>
              </div>
              <button className="w-full py-3 bg-slate-800 dark:bg-slate-100 dark:text-slate-900 text-white font-bold rounded-xl hover:opacity-90 transition-all text-sm">
                Save Adjustments
              </button>
            </div>
          </NeumorphicCard>
        )}
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1 rounded-[2.5rem] overflow-hidden neumorphic-raised relative">
        {!loading && selectedPremise ? (
          <MapContainer 
            center={[selectedPremise.lat, selectedPremise.lng]} 
            zoom={18} 
            className="w-full h-full"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {premises.map(p => (
              <React.Fragment key={p.id}>
                <Marker position={[p.lat, p.lng]}>
                  <Popup>
                    <div className="p-1">
                      <p className="font-bold text-sm m-0">{p.name}</p>
                      <p className="text-xs text-slate-500 m-0">{p.hours}</p>
                    </div>
                  </Popup>
                </Marker>
                <Circle 
                  center={[p.lat, p.lng]} 
                  radius={p.radius}
                  pathOptions={{ 
                    color: p.id === selectedId ? '#4F8EF7' : '#94A3B8',
                    fillColor: p.id === selectedId ? '#4F8EF7' : '#94A3B8',
                    fillOpacity: 0.1
                  }}
                />
              </React.Fragment>
            ))}
            <div className="absolute top-6 right-6 z-[1000] flex flex-col gap-2">
              <button className="w-10 h-10 rounded-xl bg-white neumorphic-raised flex items-center justify-center text-slate-600 hover:text-primary transition-all">
                <Maximize2 className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-xl bg-white neumorphic-raised flex items-center justify-center text-slate-600 hover:text-primary transition-all">
                <MapIcon className="w-5 h-5" />
              </button>
            </div>
          </MapContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 animate-pulse">
            <MapIcon className="w-12 h-12 text-slate-300" />
          </div>
        )}
      </div>
    </div>
  );
};
