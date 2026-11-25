'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Chargement } from '@/components/ui';
import { useAuth } from '@/lib/auth';

/** Accueil : tableau de bord pour les autorités, dossiers pour les assureurs. */
export default function Accueil() {
  const { user, pret, autorite } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (pret) router.replace(!user ? '/login' : autorite ? '/tableau-de-bord' : '/dossiers');
  }, [pret, user, autorite, router]);
  return <div className="p-10"><Chargement /></div>;
}
