'use client';

import 'leaflet/dist/leaflet.css';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { STATUTS } from '@/lib/format';
import type { Statistiques } from '@/lib/types';

/** Carte des accidents (points colorés par statut) et des zones à risque (cercles). */
export default function CarteDossiers({ points, zones }: { points: Statistiques['points']; zones: Statistiques['zonesARisque'] }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let carte: import('leaflet').Map | null = null;
    let annule = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (annule || !ref.current) return;
      // Centre par défaut : Yaoundé, si aucun dossier n'est géolocalisé.
      carte = L.map(ref.current, { scrollWheelZoom: false }).setView([3.848, 11.502], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; contributeurs OpenStreetMap',
      }).addTo(carte);
      const max = Math.max(1, ...zones.map((z) => z.n));
      for (const z of zones) {
        L.circle([z.lat, z.lng], { radius: 250 + 650 * (z.n / max), color: '#e11d48', weight: 1, fillColor: '#e11d48', fillOpacity: 0.12 })
          .bindTooltip(`${z.n} accident${z.n > 1 ? 's' : ''} dans cette zone`)
          .addTo(carte);
      }
      for (const p of points) {
        L.circleMarker([p.lat, p.lng], { radius: 6, color: '#fff', weight: 1.5, fillColor: STATUTS[p.statut].point, fillOpacity: 0.95 })
          .bindTooltip(`${p.numero} · ${STATUTS[p.statut].libelle}`)
          .on('click', () => router.push(`/dossiers/${p.id}`))
          .addTo(carte);
      }
      if (points.length > 0) carte.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])).pad(0.2), { maxZoom: 15 });
    })();
    return () => {
      annule = true;
      carte?.remove();
    };
  }, [points, zones, router]);

  return <div ref={ref} className="h-[420px] w-full overflow-hidden rounded-md" />;
}
