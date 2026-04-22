'use client';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Profile } from '@/lib/supabase';

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function icon(p: Profile, self: boolean) {
  const letter = (p.name[0] || '?').toUpperCase();
  const avatarInner = p.avatar
    ? `<img src="${p.avatar}" style="width:100%;height:100%;object-fit:cover" />`
    : `<span style="font-family:Menlo,monospace;color:#00ff41;font-size:18px;font-weight:bold">${letter}</span>`;
  const statusBadge = p.status
    ? `<div style="background:#000;border:1px solid #00ff41;padding:3px 6px;font-family:Menlo,monospace;color:#00ff41;font-size:10px;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px">${escapeHtml(p.status)}</div>`
    : '';
  const ring = self ? 'border:2px solid #fff' : 'border:1px solid #00ff41';
  return L.divIcon({
    className: 'popin-marker',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%)">
      <div style="width:36px;height:36px;background:#000;${ring};display:flex;align-items:center;justify-content:center;overflow:hidden">${avatarInner}</div>
      ${statusBadge}
      <div style="margin-top:2px;background:#fff;color:#000;font-family:Menlo,monospace;font-size:10px;font-weight:bold;padding:1px 4px">${escapeHtml(p.name)}</div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function FlyTo({ lat, lng, zoom, seq }: { lat: number; lng: number; zoom: number; seq: number }) {
  const map = useMap();
  useEffect(() => {
    if (seq === 0) return;
    map.flyTo([lat, lng], zoom, { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seq]);
  return null;
}

export default function Map({ me, friends, focusId, onFocused }: {
  me: Profile;
  friends: Profile[];
  focusId?: string | null;
  onFocused?: () => void;
}) {
  const hasFix = me.lat != null && me.lng != null;
  const center: [number, number] = [me.lat ?? 39.5, me.lng ?? -98.35];
  const zoom = hasFix ? 13 : 4;

  const [fly, setFly] = useState({ lat: center[0], lng: center[1], zoom, seq: 0 });
  const seqRef = useRef(0);
  const didInitFly = useRef(false);

  useEffect(() => {
    if (didInitFly.current) return;
    if (me.lat != null && me.lng != null) {
      seqRef.current++;
      setFly({ lat: me.lat, lng: me.lng, zoom: 13, seq: seqRef.current });
      didInitFly.current = true;
    }
  }, [me.lat, me.lng]);

  useEffect(() => {
    if (!focusId) return;
    if (focusId === 'me') {
      if (me.lat != null && me.lng != null) {
        seqRef.current++;
        setFly({ lat: me.lat, lng: me.lng, zoom: 14, seq: seqRef.current });
      }
    } else {
      const f = friends.find((x) => x.id === focusId);
      if (f?.lat != null && f?.lng != null) {
        seqRef.current++;
        setFly({ lat: f.lat, lng: f.lng, zoom: 15, seq: seqRef.current });
      }
    }
    onFocused?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', minHeight: 0 }}>
      <MapContainer center={center} zoom={zoom} style={{ flex: 1, background: '#111' }} zoomControl={false} attributionControl={false}>
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" subdomains={['a', 'b', 'c', 'd']} />
        <FlyTo {...fly} />
        {hasFix && <Marker position={[me.lat!, me.lng!]} icon={icon(me, true)} />}
        {friends.filter((f) => f.lat != null && f.lng != null).map((f) => (
          <Marker key={f.id} position={[f.lat!, f.lng!]} icon={icon(f, false)} />
        ))}
      </MapContainer>
      {!hasFix && (
        <div style={{
          position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
          background: '#000', border: '1px solid var(--green)', color: 'var(--green)',
          padding: '6px 12px', fontSize: 11, zIndex: 500,
        }}>
          {'> ACQUIRING SIGNAL...'}
        </div>
      )}
    </div>
  );
}
