'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Bouton, Champ, Erreur, inputCls } from '@/components/ui';
import { useAuth } from '@/lib/auth';

function FormulaireConnexion() {
  const { connexion, user, pret } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState<string | null>(params.get('expire') ? 'Votre session a expiré, reconnectez-vous.' : null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (pret && user) router.replace('/dossiers');
  }, [pret, user, router]);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await connexion(email.trim(), motDePasse);
      router.replace('/dossiers');
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      {erreur && <Erreur message={erreur} />}
      <Champ label="Adresse e-mail professionnelle">
        <input className={inputCls} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="agent@police.cm" />
      </Champ>
      <Champ label="Mot de passe">
        <input className={inputCls} type="password" autoComplete="current-password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
      </Champ>
      <Bouton type="submit" className="w-full" disabled={envoi}>
        {envoi ? 'Connexion…' : 'Se connecter'}
      </Bouton>
    </form>
  );
}

export default function PageConnexion() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-900 p-12 text-white lg:flex">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand-600/40 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-brand-700/50 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src="/embleme.png" alt="" className="h-12 w-12 rounded-xl bg-white object-contain p-1" />
          <span className="text-lg font-bold">eConstat</span>
        </div>
        <div className="relative">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-accent">Espace autorités</p>
          <h1 className="text-4xl font-extrabold leading-tight">Les constats d’accident, transmis et vérifiés en temps réel.</h1>
          <p className="mt-4 max-w-md text-brand-100/80">
            Consultez les dossiers, visionnez la reconstitution 3D, validez ou contestez, et exportez pour l’assureur.
          </p>
        </div>
        <p className="relative text-xs text-brand-100/60">Accès réservé aux agents habilités et aux administrateurs.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <img src="/embleme.png" alt="eConstat" className="h-14 w-14 rounded-xl bg-white object-contain p-1 shadow" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Connexion</h2>
          <p className="mb-6 mt-1 text-sm text-zinc-500">Dashboard des forces de l’ordre et des assureurs</p>
          <Suspense>
            <FormulaireConnexion />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
