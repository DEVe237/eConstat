'use client';

import { KeyRound, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Avatar, Bouton, Carte, Champ, Erreur, inputCls, Pastille, Succes } from '@/components/ui';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const LIBELLE_ROLE: Record<string, string> = { administrateur: 'Administrateur', agent: 'Agent des forces de l’ordre', assureur: 'Assureur' };

export default function PageCompte() {
  const { user } = useAuth();
  const [form, setForm] = useState({ actuel: '', nouveau: '', confirmation: '' });
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [envoi, setEnvoi] = useState(false);

  async function changer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setSucces(false);
    if (form.nouveau.length < 8) return setErreur('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    if (form.nouveau !== form.confirmation) return setErreur('Les deux nouveaux mots de passe ne correspondent pas.');
    setEnvoi(true);
    try {
      await api('/auth/mot-de-passe', { method: 'POST', json: { actuel: form.actuel, nouveau: form.nouveau }, silencieux401: true });
      setSucces(true);
      setForm({ actuel: '', nouveau: '', confirmation: '' });
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Changement impossible');
    } finally {
      setEnvoi(false);
    }
  }

  if (!user) return null;
  const nom = `${user.prenom} ${user.nom}`;
  const infos: [string, string | null | undefined][] = [
    ['Nom', nom],
    ['E-mail', user.email],
    ['Téléphone', user.telephone],
    ['Rôle', LIBELLE_ROLE[user.role] ?? user.role],
    ['Matricule', user.matricule],
    ['Unité', user.unite],
    ['Compagnie', user.compagnie],
  ];

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center gap-4 rounded-md border bg-card p-5 shadow-xs sm:p-6">
        <Avatar nom={nom} taille="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{nom}</h1>
            <Pastille ton="primaire">{LIBELLE_ROLE[user.role] ?? user.role}</Pastille>
          </div>
          <p className="mt-0.5 break-all text-sm text-muted-foreground">{user.email}</p>
        </div>
      </section>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Carte titre="Informations" description="Pour les modifier, contactez un administrateur" Icone={UserRound}>
          <dl className="divide-y">
            {infos.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="break-all text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Carte>
        <Carte titre="Changer de mot de passe" description="8 caractères minimum" Icone={KeyRound}>
          <form onSubmit={changer} className="space-y-4">
            <Champ label="Mot de passe actuel"><input className={inputCls} type="password" autoComplete="current-password" required value={form.actuel} onChange={(e) => setForm({ ...form, actuel: e.target.value })} /></Champ>
            <Champ label="Nouveau mot de passe"><input className={inputCls} type="password" autoComplete="new-password" required value={form.nouveau} onChange={(e) => setForm({ ...form, nouveau: e.target.value })} /></Champ>
            <Champ label="Confirmer le nouveau mot de passe"><input className={inputCls} type="password" autoComplete="new-password" required value={form.confirmation} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} /></Champ>
            {erreur && <Erreur message={erreur} />}
            {succes && <Succes message="Mot de passe modifié." />}
            <Bouton type="submit" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Modifier le mot de passe'}</Bouton>
          </form>
        </Carte>
      </div>
    </div>
  );
}
