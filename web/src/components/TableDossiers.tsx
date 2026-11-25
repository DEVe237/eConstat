'use client';

import { ChevronRight, CloudSun } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LettreVehicule, StatutBadge } from '@/components/ui';
import { dateHeure, depuis, libelle } from '@/lib/format';
import type { DossierResume } from '@/lib/types';

/** Lignes de dossiers cliquables ; `compact` retire la météo (tableau de bord). */
export function TableDossiers({ items, compact = false, attenue = false }: { items: DossierResume[]; compact?: boolean; attenue?: boolean }) {
  const router = useRouter();
  return (
    <div className="relative overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/50">
          <tr className="border-b [&>th]:h-10 [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:font-medium">
            <th>Dossier</th>
            <th>Véhicules</th>
            <th>Accident</th>
            {!compact && <th>Météo</th>}
            <th>Transmis</th>
            <th>Statut</th>
            <th><span className="sr-only">Ouvrir</span></th>
          </tr>
        </thead>
        <tbody className={attenue ? 'opacity-60' : ''}>
          {items.map((d) => (
            <tr key={d.id} className="group cursor-pointer border-b transition last:border-0 hover:bg-primary-soft/50 [&>td]:px-3 [&>td]:py-2.5" onClick={() => router.push(`/dossiers/${d.id}`)}>
              <td>
                <Link href={`/dossiers/${d.id}`} className="font-stats font-bold text-primary-texte" onClick={(e) => e.stopPropagation()}>{d.numero}</Link>
              </td>
              <td className="min-w-56">
                {d.vehicules.length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <div className="space-y-1">
                    {d.vehicules.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 whitespace-nowrap">
                        <LettreVehicule i={i} />
                        <span className="font-medium">{v.plaque}</span>
                        <span className="text-muted-foreground">{v.conducteurNom}</span>
                      </div>
                    ))}
                  </div>
                )}
              </td>
              <td className="whitespace-nowrap">{dateHeure(d.dateAccident)}</td>
              {!compact && (
                <td className="whitespace-nowrap text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><CloudSun className="size-4" aria-hidden />{libelle(d.conditionsMeteo)}</span>
                </td>
              )}
              <td className="whitespace-nowrap">
                {depuis(d.dateTransmission)}
                {!compact && <span className="block text-xs text-muted-foreground">{dateHeure(d.dateTransmission)}</span>}
              </td>
              <td><StatutBadge statut={d.statut} /></td>
              <td><ChevronRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
