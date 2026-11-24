'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bouton, Carte, Champ, Chargement, Erreur, inputCls, Modale, Vide } from '@/components/ui';
import { api, type Utilisateur } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateHeure } from '@/lib/format';

const VIDE = { prenom: '', nom: '', email: '', motDePasse: '', role: 'agent' as 'agent' | 'administrateur' | 'assureur', telephone: '', matricule: '', unite: '', compagnie: '' };
const LIBELLE_ROLE: Record<string, string> = { administrateur: 'Administrateur', agent: 'Agent', assureur: 'Assureur' };

export default function PageUtilisateurs() {
  const { user } = useAuth();
  const router = useRouter();
  const [liste, setListe] = useState<Utilisateur[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [form, setForm] = useState(VIDE);
  const [erreurForm, setErreurForm] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [reinit, setReinit] = useState<Utilisateur | null>(null);
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setListe(await api<Utilisateur[]>('/admin/utilisateurs'));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible');
    }
  }, []);

  useEffect(() => {
    if (user && user.role !== 'administrateur') router.replace('/dossiers');
    else charger();
  }, [user, router, charger]);

  async function creer(e: React.FormEvent) {
    e.preventDefault();
    setEnvoi(true);
    setErreurForm(null);
    try {
      const corps = Object.fromEntries(Object.entries(form).filter(([k, v]) => v !== '' && (k !== 'compagnie' || form.role === 'assureur')));
      await api('/admin/utilisateurs', { method: 'POST', json: corps });
      setOuvert(false);
      setForm(VIDE);
      await charger();
    } catch (err) {
      setErreurForm(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setEnvoi(false);
    }
  }

  async function basculer(u: Utilisateur) {
    try {
      await api(`/admin/utilisateurs/${u.id}`, { method: 'PATCH', json: { actif: !(u.actif ?? true) } });
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Modification impossible');
    }
  }

  async function reinitialiser(e: React.FormEvent) {
    e.preventDefault();
    if (!reinit) return;
    setEnvoi(true);
    setErreurForm(null);
    try {
      await api(`/admin/utilisateurs/${reinit.id}`, { method: 'PATCH', json: { motDePasse: nouveauMdp } });
      setInfo(`Mot de passe de ${reinit.prenom} ${reinit.nom} réinitialisé. Transmettez-le lui de façon sûre ; il pourra le changer dans « Mon compte ».`);
      setReinit(null);
      setNouveauMdp('');
    } catch (err) {
      setErreurForm(err instanceof Error ? err.message : 'Réinitialisation impossible');
    } finally {
      setEnvoi(false);
    }
  }

  const champ = (k: keyof typeof VIDE) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comptes</h1>
          <p className="mt-1 text-sm text-zinc-500">Agents des forces de l’ordre, assureurs et administrateurs ayant accès au dashboard.</p>
        </div>
        <Bouton onClick={() => setOuvert(true)}>Nouveau compte</Bouton>
      </div>

      {erreur && <Erreur message={erreur} />}
      {info && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{info}</div>}

      <Carte className="overflow-hidden p-0">
        {!liste ? (
          <div className="px-5"><Chargement /></div>
        ) : liste.length === 0 ? (
          <Vide titre="Aucun compte" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nom</th>
                  <th className="px-5 py-3 font-semibold">Rôle</th>
                  <th className="px-5 py-3 font-semibold">Matricule · unité / compagnie</th>
                  <th className="px-5 py-3 font-semibold">Créé le</th>
                  <th className="px-5 py-3 font-semibold">Accès</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {liste.map((u) => {
                  const actif = u.actif ?? true;
                  return (
                    <tr key={u.id}>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{u.prenom} {u.nom}</p>
                        <p className="text-xs text-zinc-500">{u.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${u.role === 'administrateur' ? 'bg-brand-100 text-brand-800' : u.role === 'assureur' ? 'bg-indigo-50 text-indigo-800' : 'bg-zinc-100 text-zinc-700'}`}>
                          {LIBELLE_ROLE[u.role] ?? u.role}
                        </span>
                        {u.actif === false && <span className="ml-2 text-xs font-semibold text-rose-600">désactivé</span>}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">{(u.role === 'assureur' ? u.compagnie : [u.matricule, u.unite].filter(Boolean).join(' · ')) || '—'}</td>
                      <td className="px-5 py-4 text-zinc-600">{dateHeure(u.dateCreation)}</td>
                      <td className="px-5 py-4">
                        {u.id === user?.id ? (
                          <span className="text-xs text-zinc-400">Vous</span>
                        ) : (
                          <div className="flex gap-2">
                            <Bouton variante="secondaire" className="px-3 py-1.5 text-xs" onClick={() => { setErreurForm(null); setReinit(u); }}>Mot de passe</Bouton>
                            <Bouton variante={actif ? 'secondaire' : 'succes'} className="px-3 py-1.5 text-xs" onClick={() => basculer(u)}>
                              {actif ? 'Désactiver' : 'Réactiver'}
                            </Bouton>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Carte>

      <Modale ouvert={reinit !== null} titre={`Réinitialiser le mot de passe${reinit ? ` de ${reinit.prenom} ${reinit.nom}` : ''}`} onFermer={() => !envoi && setReinit(null)}>
        <form onSubmit={reinitialiser} className="space-y-3">
          <Champ label="Nouveau mot de passe provisoire (8 caractères minimum)">
            <input className={inputCls} type="password" minLength={8} required autoComplete="new-password" value={nouveauMdp} onChange={(e) => setNouveauMdp(e.target.value)} />
          </Champ>
          {erreurForm && <Erreur message={erreurForm} />}
          <div className="flex justify-end gap-2 pt-2">
            <Bouton type="button" variante="secondaire" onClick={() => setReinit(null)} disabled={envoi}>Annuler</Bouton>
            <Bouton type="submit" disabled={envoi}>{envoi ? '…' : 'Réinitialiser'}</Bouton>
          </div>
        </form>
      </Modale>

      <Modale ouvert={ouvert} titre="Nouveau compte" onFermer={() => !envoi && setOuvert(false)}>
        <form onSubmit={creer} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Prénom"><input className={inputCls} required {...champ('prenom')} /></Champ>
            <Champ label="Nom"><input className={inputCls} required {...champ('nom')} /></Champ>
          </div>
          <Champ label="E-mail"><input className={inputCls} type="email" required {...champ('email')} /></Champ>
          <Champ label="Mot de passe provisoire (8 caractères minimum)"><input className={inputCls} type="password" minLength={8} required autoComplete="new-password" {...champ('motDePasse')} /></Champ>
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Rôle">
              <select className={inputCls} {...champ('role')}>
                <option value="agent">Agent</option>
                <option value="assureur">Assureur</option>
                <option value="administrateur">Administrateur</option>
              </select>
            </Champ>
            <Champ label="Téléphone"><input className={inputCls} {...champ('telephone')} /></Champ>
          </div>
          {form.role === 'assureur' && (
            <Champ label="Compagnie d’assurance (le compte ne verra que les dossiers transmis à cette compagnie)">
              <input className={inputCls} required placeholder="ex. Assurances du Cameroun" {...champ('compagnie')} />
            </Champ>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Champ label="Matricule"><input className={inputCls} {...champ('matricule')} /></Champ>
            <Champ label="Unité"><input className={inputCls} placeholder="Commissariat, brigade…" {...champ('unite')} /></Champ>
          </div>
          {erreurForm && <Erreur message={erreurForm} />}
          <div className="flex justify-end gap-2 pt-2">
            <Bouton type="button" variante="secondaire" onClick={() => setOuvert(false)} disabled={envoi}>Annuler</Bouton>
            <Bouton type="submit" disabled={envoi}>{envoi ? 'Création…' : 'Créer le compte'}</Bouton>
          </div>
        </form>
      </Modale>
    </div>
  );
}
