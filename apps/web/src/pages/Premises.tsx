/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Map as MapIcon, MapPin, Navigation, RefreshCw, Plus, Pencil, X, Check, Trash2 } from 'lucide-react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../lib/api';
import { NeumorphicCard } from '../components/common/NeumorphicCard';
import { cn } from '../lib/utils';
import { ConfirmModal } from '../components/common/ConfirmModal';

// ✅ Bundle leaflet icons locally — works offline and respects CSP
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});
// ─── Types ────────────────────────────────────────────────────────────────────

type Premise = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
};

type PremiseFormData = {
  name: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
};

const EMPTY_FORM: PremiseFormData = { name: '', latitude: '', longitude: '', radiusMeters: '' };

const DEFAULT_CENTER = { lat: 17.7324, lng: 83.3213 };

// ─── Map location picker (add / edit modal) ───────────────────────────────────

const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
};

const DraggableLocationMarker: React.FC<{
  position: [number, number];
  onChange: (lat: number, lng: number) => void;
}> = ({ position, onChange }) => {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });

  return (
    <Marker
      position={position}
      draggable
      eventHandlers={{
        dragend(e) {
          const { lat, lng } = e.target.getLatLng();
          onChange(lat, lng);
        },
      }}
    />
  );
};

const PremiseLocationPicker: React.FC<{
  latitude: string;
  longitude: string;
  radiusMeters: string;
  onChange: (lat: number, lng: number) => void;
}> = ({ latitude, longitude, radiusMeters, onChange }) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const position: [number, number] =
    !isNaN(lat) && !isNaN(lng) ? [lat, lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];
  const radius = Number(radiusMeters);

  const handleChange = (newLat: number, newLng: number) => {
    onChange(newLat, newLng);
  };

  return (
    <div>
      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
        Pick location on map
      </label>
      <div className="h-52 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        <MapContainer center={position} zoom={18} className="w-full h-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={position} />
          <DraggableLocationMarker position={position} onChange={handleChange} />
          {!isNaN(radius) && radius > 0 && (
            <Circle
              center={position}
              radius={radius}
              pathOptions={{ color: '#4F8EF7', fillColor: '#4F8EF7', fillOpacity: 0.12 }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-slate-500 mt-2">
        Drag the marker or click the map — latitude and longitude update automatically.
      </p>
    </div>
  );
};

// ─── Modal ────────────────────────────────────────────────────────────────────

const Modal: React.FC<{
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  onDelete?: () => void;
  submitting: boolean;
  submitLabel: string;
  form: PremiseFormData;
  onChange: (field: keyof PremiseFormData, value: string) => void;
  onLocationChange: (lat: number, lng: number) => void;
  error: string;
}> = ({ title, onClose, onSubmit, onDelete, submitting, submitLabel, form, onChange, onLocationChange, error }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

    {/* Modal card */}
    <div className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
      <NeumorphicCard className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 font-headline">{title}</h3>
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                disabled={submitting}
                className="px-3 py-2 rounded-xl bg-danger/10 text-danger text-xs font-black hover:bg-danger/15 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Premise
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
              Premise Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => onChange('name', e.target.value)}
              placeholder="e.g. Campus A"
              className="w-full px-4 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 neumorphic-inset"
            />
          </div>

          <PremiseLocationPicker
            latitude={form.latitude}
            longitude={form.longitude}
            radiusMeters={form.radiusMeters}
            onChange={onLocationChange}
          />

          {/* Lat / Lng row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={e => onChange('latitude', e.target.value)}
                placeholder="17.7324"
                className="w-full px-4 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 neumorphic-inset"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={e => onChange('longitude', e.target.value)}
                placeholder="83.3213"
                className="w-full px-4 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 neumorphic-inset"
              />
            </div>
          </div>

          {/* Radius */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
              Radius (metres)
            </label>
            <input
              type="number"
              value={form.radiusMeters}
              onChange={e => onChange('radiusMeters', e.target.value)}
              placeholder="100"
              className="w-full px-4 py-3 rounded-xl bg-bg-light dark:bg-bg-dark border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 neumorphic-inset"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-4 text-xs font-bold text-danger bg-danger/10 px-4 py-3 rounded-xl">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {submitLabel}
          </button>
        </div>
      </NeumorphicCard>
    </div>
  </div>
);

// ─── Premises Page ────────────────────────────────────────────────────────────

export const Premises = () => {
  const [premises, setPremises] = useState<Premise[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal state
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState<PremiseFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPremises = async () => {
    try {
      const res = await api.get('/geofence/locations');
      const mapped = (res.data.data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        lat: p.latitude,
        lng: p.longitude,
        radius: p.radiusMeters,
      }));
      setPremises(mapped);
      setSelectedId(prev => prev ?? mapped[0]?.id ?? null);
    } catch {
      setError('Failed to load premises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPremises(); }, []);

  const selectedPremise = premises.find(p => p.id === selectedId) || premises[0];

  // ── Form helpers ───────────────────────────────────────────────────────────

  const handleChange = (field: keyof PremiseFormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setFormError('');
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setForm(f => ({
      ...f,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    }));
    setFormError('');
  };

  const getDefaultLocation = () => {
    if (selectedPremise) return { lat: selectedPremise.lat, lng: selectedPremise.lng };
    if (premises[0]) return { lat: premises[0].lat, lng: premises[0].lng };
    return DEFAULT_CENTER;
  };

  const validate = () => {
    if (!form.name.trim()) return 'Name is required.';
    if (!form.latitude || isNaN(Number(form.latitude))) return 'Valid latitude is required.';
    if (!form.longitude || isNaN(Number(form.longitude))) return 'Valid longitude is required.';
    if (!form.radiusMeters || isNaN(Number(form.radiusMeters)) || Number(form.radiusMeters) <= 0)
      return 'Radius must be a positive number.';
    return '';
  };

  // ── Open Edit ──────────────────────────────────────────────────────────────

  const openEdit = () => {
    if (!selectedPremise) return;
    setForm({
      name: selectedPremise.name,
      latitude: String(selectedPremise.lat),
      longitude: String(selectedPremise.lng),
      radiusMeters: String(selectedPremise.radius),
    });
    setFormError('');
    setShowEdit(true);
  };

  // ── Open Add ───────────────────────────────────────────────────────────────

  const openAdd = () => {
    const { lat, lng } = getDefaultLocation();
    setForm({
      ...EMPTY_FORM,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
      radiusMeters: '100',
    });
    setFormError('');
    setShowAdd(true);
  };

  // ── Submit Add ─────────────────────────────────────────────────────────────
  // NOTE: Uses POST /geofence/locations (or equivalent admin endpoint).
  // Adjust the path below to match your backend once implemented.

  const handleAdd = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    setSubmitting(true);
    try {
      await api.post('/geofence/locations', {
        name: form.name.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radiusMeters: Number(form.radiusMeters),
      });
      setShowAdd(false);
      setLoading(true);
      await fetchPremises();
    } catch (e: any) {
      setFormError(e.response?.data?.message ?? 'Failed to create premise.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Submit Edit ────────────────────────────────────────────────────────────
  // Uses PATCH /admin/config/working-hours/:locationId for working-hours fields.
  // For name/lat/lng/radius updates, adjust the endpoint to match your backend.

  const handleEdit = async () => {
    const err = validate();
    if (err) { setFormError(err); return; }
    if (!selectedPremise) return;
    setSubmitting(true);
    try {
      await api.put(`/geofence/locations/${selectedPremise.id}`, {
        name: form.name.trim(),
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radiusMeters: Number(form.radiusMeters),
      });
      setShowEdit(false);
      setLoading(true);
      await fetchPremises();
    } catch (e: any) {
      setFormError(e.response?.data?.message ?? 'Failed to update premise.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPremise) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedPremise) return;
    setSubmitting(true);
    setFormError('');
    try {
      await api.delete(`/geofence/locations/${selectedPremise.id}`);
      setShowEdit(false);
      setShowDeleteConfirm(false);
      setSelectedId(null);
      setLoading(true);
      await fetchPremises();
    } catch (e: any) {
      setFormError(e.response?.data?.message ?? 'Failed to delete premise.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Add Modal */}
      {showAdd && (
        <Modal
          title="Add New Premise"
          onClose={() => setShowAdd(false)}
          onSubmit={handleAdd}
          submitting={submitting}
          submitLabel="Add Premise"
          form={form}
          onChange={handleChange}
          onLocationChange={handleLocationChange}
          error={formError}
        />
      )}

      {/* Edit Modal */}
      {showEdit && (
        <Modal
          title="Edit Premise"
          onClose={() => setShowEdit(false)}
          onSubmit={handleEdit}
          onDelete={handleDelete}
          submitting={submitting}
          submitLabel="Save Changes"
          form={form}
          onChange={handleChange}
          onLocationChange={handleLocationChange}
          error={formError}
        />
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete premise"
        message={selectedPremise ? `Are you sure you want to delete "${selectedPremise.name}"? This cannot be undone.` : 'Are you sure you want to delete this premise?'}
        confirmLabel="Delete"
        danger
        confirming={submitting}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
      />

      <div className="h-[calc(100vh-120px)] flex gap-8 animate-in zoom-in-95 duration-500">
        {/* ── Sidebar ── */}
        <div className="w-96 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">

          {/* Header row */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-headline">
                Manage Premises
              </h2>
              <p className="text-slate-500 text-sm mt-1">Active geofence locations from the backend.</p>
            </div>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-colors shadow-md shrink-0 mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Premise
            </button>
          </div>

          {/* Premise list */}
          <div className="space-y-4">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-24 w-full rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 animate-pulse" />
              ))
            ) : error ? (
              <NeumorphicCard className="p-6 text-center">
                <p className="font-bold text-danger">{error}</p>
              </NeumorphicCard>
            ) : premises.length === 0 ? (
              <NeumorphicCard className="p-6 text-center">
                <p className="font-bold text-slate-500">No active premises found</p>
              </NeumorphicCard>
            ) : premises.map(p => (
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
                    'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                    selectedId === p.id ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  )}>
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</h4>
                    <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <Navigation className="w-3 h-3" />
                      <span>{p.radius}m radius</span>
                    </div>
                  </div>
                </div>
              </NeumorphicCard>
            ))}
          </div>

          {/* Geofence parameters + Edit button */}
          {selectedPremise && (
            <NeumorphicCard className="p-6 mt-auto">
              <div className="flex items-center justify-between mb-6">
                <h5 className="font-black text-xs uppercase tracking-widest text-slate-400 font-headline">
                  Geofence Parameters
                </h5>
                <button
                  onClick={openEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary text-slate-500 text-xs font-bold transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500 font-bold">Name</span>
                  <span className="text-slate-800 dark:text-slate-100 font-bold truncate max-w-[160px] text-right">
                    {selectedPremise.name}
                  </span>
                </div>
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

        {/* ── Map ── */}
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
              {loading
                ? <RefreshCw className="w-12 h-12 text-primary animate-spin" />
                : <MapIcon className="w-12 h-12 text-slate-300" />
              }
            </div>
          )}
        </div>
      </div>
    </>
  );
};