'use client';

import { Building2, KeyRound, Search, Shield, ShieldCheck, UserCheck, UserPlus, Users, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Avatar, Bouton, Carte, Champ, EntetePage, Erreur, GrilleStats, inputCls, Modale, Pastille, Squelette, Succes, Vide } from '@/components/ui';
import { api, type Utilisateur } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateHeure, ROLES } from '@/lib/format';

const VIDE = { prenom: '', nom: '', email: '', motDePasse: '', role: 'agent' as 'agent' | 'administrateur' | 'assureur', telephone: '', matricule: '', unite: '', compagnie: '' };

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
  const [recherche, setRecherche] = useState('');

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

  const compte = (role: string) => liste?.filter((u) => u.role === role).length ?? 0;
  const q = recherche.trim().toLowerCase();
  const visibles = (liste ?? []).filter((u) => [u.prenom, u.nom, u.email, u.matricule, u.unite, u.compagnie, ROLES[u.role]].join(' ').toLowerCase().includes(q));
  const ouvrirCreation = () => {
    setErreurForm(null);
    setOuvert(true);
  };

  return (
    <div className="space-y-4">
      <EntetePage
        titre="Comptes"
        Icone={Users}
        description="Agents des forces de l’ordre, assureurs et administrateurs ayant accès au dashboard."
        pastille={liste && <Pastille ton="primaire">{liste.length} compte{liste.length > 1 ? 's' : ''}</Pastille>}
      >
        <Bouton onClick={ouvrirCreation}><UserPlus /> Nouveau compte</Bouton>
      </EntetePage>

      {erreur && <Erreur message={erreur} />}
      {info && <Succes message={info} />}

      {liste && (
        <GrilleStats
          stats={[
            { titre: 'Agents', valeur: compte('agent'), sous: 'Traitent les dossiers', Icone: Shield, teinte: 'bleu' },
            { titre: 'Assureurs', valeur: compte('assureur'), sous: 'Consultation seule', Icone: Building2, teinte: 'vert' },
            { titre: 'Administrateurs', valeur: compte('administrateur'), sous: 'Gèrent aussi les comptes', Icone: ShieldCheck, teinte: 'violet' },
            { titre: 'Désactivés', valeur: liste.filter((u) => u.actif === false).length, sous: 'Accès coupé', Icone: UserX, teinte: 'rouge' },
          ]}
        />
      )}

      <Carte titre="Liste des comptes" description="Créer, désactiver ou réinitialiser un accès" Icone={Users}>
        <div className="relative mb-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input className={`${inputCls} h-9 pl-9`} aria-label="Rechercher un compte" placeholder="Rechercher un compte…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>
        {!liste ? (
          <div className="space-y-2" role="status" aria-label="Chargement">{[0, 1, 2, 3].map((i) => <Squelette key={i} className="h-14" />)}</div>
        ) : visibles.length === 0 ? (
          <Vide titre="Aucun compte" texte={q ? 'Aucun compte ne correspond à cette recherche.' : undefined} />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr className="border-b [&>th]:h-10 [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:font-medium">
                  <th>Nom</th>
                  <th>Rôle</th>
                  <th>Matricule · unité / compagnie</th>
                  <th>Créé le</th>
                  <th>Accès</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((u) => {
                  const actif = u.actif ?? true;
                  return (
                    <tr key={u.id} className="border-b transition last:border-0 hover:bg-primary-soft/40 [&>td]:px-3 [&>td]:py-2.5">
                      <td>
                        <div className={`flex items-center gap-3 ${actif ? '' : 'opacity-60'}`}>
                          <Avatar nom={`${u.prenom} ${u.nom}`} />
                          <div className="min-w-0">
                            <p className="font-semibold">{u.prenom} {u.nom}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          <Pastille ton={u.role === 'administrateur' ? 'primaire' : u.role === 'assureur' ? 'vert' : 'bleu'}>{ROLES[u.role] ?? u.role}</Pastille>
                          {!actif && <Pastille ton="rouge">Désactivé</Pastille>}
                        </div>
                      </td>
                      <td className="text-muted-foreground">{(u.role === 'assureur' ? u.compagnie : [u.matricule, u.unite].filter(Boolean).join(' · ')) || '—'}</td>
                      <td className="whitespace-nowrap text-muted-foreground">{dateHeure(u.dateCreation)}</td>
                      <td>
                        {u.id === user?.id ? (
                          <Pastille>Vous</Pastille>
                        ) : (
                          <div className="flex gap-2">
                            <Bouton taille="sm" variante="secondaire" onClick={() => { setErreurForm(null); setReinit(u); }}><KeyRound /> Mot de passe</Bouton>
                            <Bouton taille="sm" variante={actif ? 'danger' : 'succes'} onClick={() => basculer(u)}>
                              {actif ? <><UserX /> Désactiver</> : <><UserCheck /> Réactiver</>}
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
        <form onSubmit={reinitialiser} className="space-y-4">
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
        <form onSubmit={creer} className="space-y-4">
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
