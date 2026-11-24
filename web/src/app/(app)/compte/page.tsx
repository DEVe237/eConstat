'use client';

import { useState } from 'react';
import { Bouton, Carte, Champ, Erreur, inputCls } from '@/components/ui';
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
  const infos: [string, string | null | undefined][] = [
    ['Nom', `${user.prenom} ${user.nom}`],
    ['E-mail', user.email],
    ['Rôle', LIBELLE_ROLE[user.role] ?? user.role],
    ['Matricule', user.matricule],
    ['Unité', user.unite],
    ['Compagnie', user.compagnie],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Mon compte</h1>
        <p className="mt-1 text-sm text-zinc-500">Vos informations et votre mot de passe.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Carte titre="Informations">
          <dl className="divide-y divide-zinc-100">
            {infos.filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
                <dt className="text-zinc-500">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-zinc-500">Pour modifier ces informations, contactez un administrateur.</p>
        </Carte>
        <Carte titre="Changer de mot de passe">
          <form onSubmit={changer} className="space-y-3">
            <Champ label="Mot de passe actuel"><input className={inputCls} type="password" autoComplete="current-password" required value={form.actuel} onChange={(e) => setForm({ ...form, actuel: e.target.value })} /></Champ>
            <Champ label="Nouveau mot de passe (8 caractères minimum)"><input className={inputCls} type="password" autoComplete="new-password" required value={form.nouveau} onChange={(e) => setForm({ ...form, nouveau: e.target.value })} /></Champ>
            <Champ label="Confirmer le nouveau mot de passe"><input className={inputCls} type="password" autoComplete="new-password" required value={form.confirmation} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} /></Champ>
            {erreur && <Erreur message={erreur} />}
            {succes && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Mot de passe modifié.</div>}
            <Bouton type="submit" disabled={envoi}>{envoi ? 'Enregistrement…' : 'Modifier le mot de passe'}</Bouton>
          </form>
        </Carte>
      </div>
    </div>
  );
}
