'use client';

import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { BoutonTheme } from '@/components/theme';
import { Bouton, Champ, Erreur, inputCls } from '@/components/ui';
import { useAuth } from '@/lib/auth';

function FormulaireConnexion() {
  const { connexion, user, pret } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [visible, setVisible] = useState(false);
  const [erreur, setErreur] = useState<string | null>(params.get('expire') ? 'Votre session a expiré, reconnectez-vous.' : null);
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    if (pret && user) router.replace('/');
  }, [pret, user, router]);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      await connexion(email.trim(), motDePasse);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Connexion impossible');
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={soumettre} className="space-y-5">
      {erreur && <Erreur message={erreur} />}
      <Champ label="E-mail">
        <input className={`${inputCls} h-10`} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="agent@police.cm" />
      </Champ>
      <div className="relative">
        <Champ label="Mot de passe">
          <input className={`${inputCls} h-10 pr-10`} type={visible ? 'text' : 'password'} autoComplete="current-password" required value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} />
        </Champ>
        <button
          type="button"
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          onClick={() => setVisible((v) => !v)}
          className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <Bouton type="submit" taille="lg" className="w-full" disabled={envoi}>
        <LogIn /> {envoi ? 'Connexion en cours…' : 'Se connecter'}
      </Bouton>
    </form>
  );
}

/** Grille décorative discrète, dans un coin. */
function Grille({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute size-80 opacity-70 ${className}`}
      style={{
        backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(circle at center, black, transparent 70%)',
      }}
    />
  );
}

export default function PageConnexion() {
  return (
    <main className="grid min-h-dvh bg-fond lg:grid-cols-2">
      <div className="relative flex flex-col items-center overflow-hidden p-6 md:p-10">
        <Grille className="-right-16 -top-16" />
        <Grille className="-bottom-16 -left-16" />
        <div className="relative flex w-full max-w-md flex-1 flex-col justify-center py-8">
          <img src="/embleme.png" alt="eConstat" className="mb-6 size-20 object-contain lg:hidden" />
          <h1 className="text-3xl font-bold tracking-tight">Connexion</h1>
          <p className="mb-8 mt-1 text-sm text-muted-foreground">Entrez votre e-mail et votre mot de passe pour accéder à votre espace.</p>
          <Suspense>
            <FormulaireConnexion />
          </Suspense>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden /> Accès réservé aux agents habilités, aux assureurs et aux administrateurs.
          </p>
        </div>
        <div className="relative flex items-center gap-3 text-xs text-muted-foreground">
          eConstat · Espace autorités et assureurs
          <BoutonTheme />
        </div>
      </div>
      <div className="relative hidden items-center justify-center overflow-hidden border-l bg-linear-to-br from-primary-soft via-card to-primary-soft p-12 lg:flex">
        <div className="max-w-lg text-center">
          <img src="/embleme.png" alt="" className="mx-auto size-72 object-contain" />
          <p className="mt-8 text-3xl font-bold tracking-tight text-primary-texte">eConstat</p>
          <p className="mt-3 text-lg text-muted-foreground">Les constats d’accident, transmis par les conducteurs et vérifiés par les autorités, avec reconstitution 3D.</p>
        </div>
      </div>
    </main>
  );
}
