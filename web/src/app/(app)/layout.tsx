'use client';

import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Coquille } from '@/components/Coquille';
import { Bouton, Chargement } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

/** Nombre de dossiers en attente, rafraîchi toutes les 30 s, avec une alerte quand il augmente. */
function useDossiersATraiter(actif: boolean) {
  const [n, setN] = useState<number | null>(null);
  const [alerte, setAlerte] = useState<string | null>(null);
  const precedent = useRef<number | null>(null);
  useEffect(() => {
    if (!actif) return;
    let annule = false;
    const verifier = async () => {
      try {
        const { total } = await api<{ total: number }>('/dashboard/dossiers?statut=transmis&limite=1');
        if (annule) return;
        if (precedent.current !== null && total > precedent.current) {
          const nouveaux = total - precedent.current;
          setAlerte(`${nouveaux} nouveau${nouveaux > 1 ? 'x' : ''} dossier${nouveaux > 1 ? 's' : ''} à traiter`);
        }
        precedent.current = total;
        setN(total);
      } catch {
        /* réseau indisponible : nouvel essai au prochain passage */
      }
    };
    verifier();
    const t = setInterval(verifier, 30_000);
    return () => {
      annule = true;
      clearInterval(t);
    };
  }, [actif]);
  return { n, alerte, fermerAlerte: () => setAlerte(null) };
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, pret, autorite } = useAuth();
  const router = useRouter();
  const { n, alerte, fermerAlerte } = useDossiersATraiter(pret && autorite);

  useEffect(() => {
    if (pret && !user) router.replace('/login');
  }, [pret, user, router]);

  useEffect(() => {
    if (!alerte) return;
    const t = setTimeout(fermerAlerte, 8000);
    return () => clearTimeout(t);
  }, [alerte, fermerAlerte]);

  if (!pret || !user) return <div className="p-10"><Chargement /></div>;

  return (
    <>
      <Coquille aTraiter={autorite ? n : null}>{children}</Coquille>
      {alerte && (
        <div role="status" className="apparition fixed bottom-6 right-6 z-[1100] flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm shadow-xl">
          <span className="size-2.5 animate-pulse rounded-full bg-amber-500" />
          <span className="font-semibold">{alerte}</span>
          <Bouton taille="sm" onClick={() => { fermerAlerte(); router.push('/dossiers'); }}>Voir</Bouton>
          <button type="button" aria-label="Fermer" className="rounded-md p-1 text-muted-foreground hover:bg-muted" onClick={fermerAlerte}><X className="size-4" /></button>
        </div>
      )}
    </>
  );
}
