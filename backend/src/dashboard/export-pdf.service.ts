import { Injectable } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { extname, join, normalize } from 'path';
import puppeteer from 'puppeteer';
import type { JwtPayload } from '../auth/jwt.strategy';
import { DashboardService } from './dashboard.service';

type Detail = Awaited<ReturnType<DashboardService['detailBrut']>>;

const UPLOADS_ROOT = join(process.cwd(), 'uploads');
const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };
const LIBELLE_STATUT: Record<string, string> = { transmis: 'Transmis — en attente', valide: 'Validé', conteste: 'Contesté', brouillon: 'Brouillon' };
const LIBELLE_EVT: Record<string, string> = {
  creation: 'Création',
  transmission: 'Transmission aux autorités',
  prise_en_charge: 'Prise en charge',
  validation: 'Validation',
  contestation: 'Contestation',
  complement: 'Remarque',
  temoignage: 'Témoignage recueilli',
  envoi_assureur: "Transmission à l'assureur",
};

const LIBELLES: Record<string, string> = {
  avant: 'Avant', arriere: 'Arrière', flanc_gauche: 'Flanc gauche', flanc_droit: 'Flanc droit',
  gauche: 'Tournait à gauche', droite: 'Tournait à droite', tout_droit: 'Tout droit', stationnement: 'En stationnement',
  meteo_beau: 'Beau temps', meteo_pluie: 'Pluie', meteo_humide: 'Chaussée humide', meteo_brouillard: 'Brouillard', meteo_nuit: 'Nuit',
};
const CATEGORIE: Record<string, string> = {
  plaque: 'Plaque', vue_ensemble: 'Vue d’ensemble', vehicule: 'Véhicule', carte_grise: 'Carte grise',
  visite_technique: 'Visite technique', assurance: 'Attestation d’assurance', cni: 'CNI', permis: 'Permis de conduire',
  autre_document: 'Autre document', video_tour: 'Vidéo du tour', libre: 'Photo',
};
const DOCUMENTS = ['carte_grise', 'visite_technique', 'assurance', 'cni', 'permis', 'autre_document'];
/** Valeurs techniques saisies dans l'app → libellés lisibles (flanc_gauche → Flanc gauche). */
const lib = (v: string | null) => (v ? (LIBELLES[v] ?? v.charAt(0).toUpperCase() + v.slice(1).replace(/_/g, ' ')) : null);
const kmh = (v: string | null) => (v ? `${v.replace(/\D+$/, '')} km/h` : null);

const esc = (s: unknown) =>
  String(s ?? '—').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const dt = (d: Date | string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Douala' }) : '—';

/**
 * Export PDF d'un dossier (cahier des charges §5.4 / EF-10) pour archivage ou
 * transmission à l'assureur. Rendu HTML → PDF avec le Chromium déjà utilisé
 * par le worker 3D.
 */
@Injectable()
export class ExportPdfService {
  constructor(private readonly dashboard: DashboardService) {}

  async generer(id: string, user: JwtPayload): Promise<{ pdf: Buffer; nomFichier: string }> {
    const dossier = await this.dashboard.detailBrut(id, user);
    const html = this.html(dossier);
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' },
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: `<div style="font-size:8px;width:100%;padding:0 14mm;color:#666;display:flex;justify-content:space-between">
          <span>eConstat — dossier ${esc(dossier.numero)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
      });
      return { pdf: Buffer.from(pdf), nomFichier: `constat-${dossier.numero.slice(1)}.pdf` };
    } finally {
      await browser.close();
    }
  }

  /** Les fichiers uploadés sont lus sur disque et intégrés au PDF (pas de dépendance réseau). */
  private image(url: string): string | null {
    if (!url.startsWith('/uploads/')) return null;
    const chemin = normalize(join(UPLOADS_ROOT, url.slice('/uploads/'.length)));
    if (!chemin.startsWith(UPLOADS_ROOT) || !existsSync(chemin)) return null;
    const mime = MIME[extname(chemin).toLowerCase()];
    if (!mime) return null;
    return `data:${mime};base64,${readFileSync(chemin).toString('base64')}`;
  }

  private html(d: Detail): string {
    const vehicules = d.vehiculesImpliques
      .map(
        (v, i) => `<div class="card"><h3>Véhicule ${String.fromCharCode(65 + i)}</h3><table>
          <tr><th>Conducteur</th><td>${esc(v.conducteurNom)}</td></tr>
          <tr><th>Immatriculation</th><td>${esc(v.plaque)}</td></tr>
          <tr><th>Marque / modèle</th><td>${esc(v.marque)}</td></tr>
          <tr><th>Vitesse estimée</th><td>${esc(kmh(v.vitesseEstimee))}</td></tr>
          <tr><th>Trajectoire</th><td>${esc(lib(v.sensCirculation))}</td></tr>
          <tr><th>Zone de choc</th><td>${esc(lib(v.zoneChoc))}</td></tr></table></div>`,
      )
      .join('');
    const photos = d.medias
      .filter((m) => m.type === 'photo' && !DOCUMENTS.includes(m.categorie))
      .map((m) => ({ m, src: this.image(m.url) }))
      .filter((x): x is { m: (typeof d.medias)[number]; src: string } => !!x.src)
      .map(({ m, src }) => `<figure class="photo"><img src="${src}"><figcaption>${esc(CATEGORIE[m.categorie] ?? m.categorie)}${m.conducteur ? ` ${m.conducteur}` : ''}</figcaption></figure>`)
      .join('');
    // Pièces justificatives par conducteur : fournie, déclarée absente, ou manquante.
    const pieces = (['A', 'B'] as const)
      .map((c) => {
        const lignes = DOCUMENTS.map((cat) => {
          const fournie = d.medias.some((m) => m.categorie === cat && m.conducteur === c);
          const absente = d.documentsAbsents.some((a) => a.categorie === cat && a.conducteur === c);
          const etat = fournie ? '✔ Fournie' : absente ? '✘ Déclarée absente par le conducteur' : '— Non renseignée';
          return `<tr><th>${esc(CATEGORIE[cat])}</th><td>${etat}</td></tr>`;
        }).join('');
        return `<div class="card"><h3>Conducteur ${c}</h3><table>${lignes}</table></div>`;
      })
      .join('');
    const docsImages = d.medias
      .filter((m) => DOCUMENTS.includes(m.categorie))
      .map((m) => ({ m, src: this.image(m.url) }))
      .filter((x): x is { m: (typeof d.medias)[number]; src: string } => !!x.src)
      .map(({ m, src }) => `<figure class="photo"><img src="${src}"><figcaption>${esc(CATEGORIE[m.categorie])} ${m.conducteur ?? ''}</figcaption></figure>`)
      .join('');
    const ia = d.analyseIA?.statut === 'terminee' ? d.analyseIA.resultat : null;
    const analyse = ia
      ? `<table>
          <tr><th>Type de collision</th><td>${esc(lib(ia.typeCollision))}${ia.angleImpactDeg >= 0 ? ` — angle estimé ${ia.angleImpactDeg}°` : ''}</td></tr>
          <tr><th>Route / météo apparentes</th><td>${esc(lib(ia.typeRoute))} · ${esc(lib(ia.conditionsMeteo))}</td></tr>
          ${ia.vehicules.map((v) => `<tr><th>Véhicule ${v.conducteur}</th><td>${esc(v.plaque || 'plaque illisible')} · ${esc(v.marque)} ${esc(v.couleur)} · choc ${esc(lib(v.zoneChoc))} · ${esc(v.degats)} (gravité ${esc(v.gravite)})</td></tr>`).join('')}
          <tr><th>Résumé</th><td>${esc(ia.resume)}</td></tr>
          <tr><th>Confiance</th><td>${Math.round(ia.confiance * 100)} % — ${d.analyseIA!.photosAnalysees} photo(s)${d.analyseIA!.imagesVideo ? ` et ${d.analyseIA!.imagesVideo} image(s) de la vidéo du tour` : ''}, modèle ${esc(d.analyseIA!.modele)}</td></tr>
        </table><p class="muted">Analyse automatique indicative, sans valeur probante : elle ne se substitue ni aux déclarations ni à la conclusion de l'agent.</p>`
      : '<span class="muted">Aucune analyse IA disponible.</span>';
    const videos = d.medias.filter((m) => m.type === 'video').length;
    const signatures = d.signatures
      .map((s) => {
        const src = this.image(s.imageUrl);
        return `<div class="sig">${src ? `<img src="${src}">` : ''}<b>${esc(s.conducteurNom)}</b><br>
          <small>Signé le ${dt(s.dateSignature)}<br>SHA-256 : <code>${esc(s.hashSignature)}</code></small></div>`;
      })
      .join('');
    const temoignages = d.temoignages
      .map(
        (t) => `<div class="card" style="margin-bottom:8px"><b>${esc(t.temoinNom)}</b>${t.temoinTelephone ? ` · ${esc(t.temoinTelephone)}` : ''}
          <div class="muted">Recueilli le ${dt(t.date)}${t.recueilliPar ? ` par ${esc(t.recueilliPar)}` : ''}</div>
          <p style="margin:6px 0 0;white-space:pre-line">${esc(t.recit)}</p></div>`,
      )
      .join('');
    const assureurs = d.transmissionsAssureurs.map((t) => `${esc(t.compagnie)} (le ${dt(t.date)})${t.remarque ? `<div class="muted" style="white-space:pre-line">Remarque : ${esc(t.remarque)}</div>` : ''}`).join('<br>');
    const sim = d.simulations3d[0];
    const evenements = d.evenements
      .map((e) => `<tr><td>${dt(e.date)}</td><td>${esc(LIBELLE_EVT[e.type] ?? e.type)}</td><td>${esc(e.auteurNom)}</td><td>${esc(e.commentaire)}</td></tr>`)
      .join('');

    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
      body{font-family:Arial,Helvetica,sans-serif;color:#18181b;font-size:11px;line-height:1.45}
      h1{font-size:20px;margin:0;color:#260259} h2{font-size:13px;color:#6204BF;border-bottom:1.5px solid #e4e4e7;padding-bottom:4px;margin:18px 0 8px}
      h3{font-size:12px;margin:0 0 6px} table{width:100%;border-collapse:collapse} th{text-align:left;color:#52525b;font-weight:600;width:38%;padding:3px 6px 3px 0;vertical-align:top}
      td{padding:3px 0;vertical-align:top} .grid{display:flex;gap:10px} .card{flex:1;border:1px solid #e4e4e7;border-radius:8px;padding:10px}
      .badge{display:inline-block;padding:3px 10px;border-radius:99px;font-weight:700;background:#ede9fe;color:#5b21b6}
      .photo{display:inline-block;width:31%;margin:0 1% 8px 0;vertical-align:top} .photo img{width:100%;border-radius:6px;border:1px solid #e4e4e7} .photo figcaption{font-size:9px;color:#52525b}
      .conclusion{border:2px solid #007A5E;border-radius:8px;padding:10px;background:#f0fdf4} .conclusion b{font-size:13px} .sig{flex:1;border:1px solid #e4e4e7;border-radius:8px;padding:8px}
      .sig img{width:100%;height:90px;object-fit:contain;display:block;margin-bottom:4px} code{font-size:8.5px;word-break:break-all}
      .ev td,.ev th{border-bottom:1px solid #f4f4f5;padding:4px 6px 4px 0;width:auto} .muted{color:#71717a}
    </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h1>Constat d'accident ${esc(d.numero)}</h1><div class="muted">Export généré le ${dt(new Date())} — dashboard autorités eConstat</div></div>
        <span class="badge">${esc(LIBELLE_STATUT[d.statut] ?? d.statut)}</span>
      </div>
      <h2>Circonstances</h2><table>
        <tr><th>Date et heure de l'accident</th><td>${dt(d.dateAccident)}</td></tr>
        <tr><th>Position GPS</th><td>${d.lat != null && d.lng != null ? `${d.lat.toFixed(5)}, ${d.lng.toFixed(5)}` : '—'}</td></tr>
        <tr><th>Conditions météo</th><td>${esc(lib(d.conditionsMeteo))}</td></tr>
        <tr><th>Point de choc déclaré</th><td>${esc(lib(d.pointDeChoc))}</td></tr>
        <tr><th>Transmis le</th><td>${dt(d.dateTransmission)}</td></tr>
        ${d.agentTraitant ? `<tr><th>Traité par</th><td>${esc(d.agentTraitant.nom)}${d.agentTraitant.matricule ? ` (matricule ${esc(d.agentTraitant.matricule)})` : ''}, le ${dt(d.dateTraitement)}</td></tr>` : ''}
        ${d.commentaireAgent && !d.conclusion ? `<tr><th>Observation de l'agent</th><td>${esc(d.commentaireAgent)}</td></tr>` : ''}
      </table>
      ${d.conclusion ? `<h2>Conclusion de l'autorité</h2><div class="conclusion"><b>${esc(d.conclusion.libelle.charAt(0).toUpperCase() + d.conclusion.libelle.slice(1))}</b>
        <p style="margin:6px 0 0;white-space:pre-line">${esc(d.commentaireAgent)}</p>
        <div class="muted">${d.agentTraitant ? `${esc(d.agentTraitant.nom)}, ` : ''}le ${dt(d.dateTraitement)}</div></div>` : ''}
      <h2>Véhicules impliqués</h2><div class="grid">${vehicules || '<span class="muted">Aucun véhicule déclaré.</span>'}</div>
      <h2>Photos</h2>${photos || '<span class="muted">Aucune photo.</span>'}${videos ? `<div class="muted">${videos} vidéo(s) disponible(s) sur le dashboard.</div>` : ''}
      <h2>Pièces justificatives</h2><div class="grid">${pieces}</div>${docsImages ? `<div style="margin-top:8px">${docsImages}</div>` : ''}
      <h2>Analyse IA des photos</h2>${analyse}
      <h2>Signatures</h2><div class="grid">${signatures || '<span class="muted">Aucune signature.</span>'}</div>
      <h2>Témoignages</h2>${temoignages || '<span class="muted">Aucun témoignage recueilli.</span>'}
      <h2>Reconstitution 3D</h2><div>${sim ? (sim.statut === 'termine' && sim.urlAnimation ? (sim.urlAnimation.startsWith('/') ? 'Vidéo disponible sur le dashboard.' : `Vidéo disponible : <code>${esc(sim.urlAnimation)}</code>`) : `Statut : ${esc(sim.statut)}`) : '<span class="muted">Non générée.</span>'}</div>
      <h2>Intégrité et horodatage</h2><table>
        <tr><th>Empreinte SHA-256 du dossier</th><td><code>${esc(d.hashIntegrite)}</code></td></tr>
        <tr><th>Horodatage certifié (RFC 3161)</th><td>${d.horodatageJeton ? `${dt(d.horodatageDate)} — autorité : ${esc(d.horodatageAutorite)}` : '<span class="muted">Non horodaté</span>'}</td></tr>
        ${assureurs ? `<tr><th>Transmis aux assureurs</th><td>${assureurs}</td></tr>` : ''}
      </table>
      <h2>Déclaration</h2>
      <p>Les conducteurs signataires ont certifié l'exactitude des informations renseignées au moment de la signature électronique dans l'application eConstat.
      L'empreinte ci-dessus est calculée sur l'ensemble des données du constat (véhicules, contenu des photos et vidéos, signatures) lors de sa transmission :
      toute modification ultérieure du dossier la rendrait invalide${d.horodatageJeton ? ", et son horodatage par un tiers de confiance atteste qu'elle existait à la date indiquée" : ''}.</p>
      <p class="muted">La reconstitution 3D illustre le scénario déclaré par les conducteurs ; elle ne constitue pas une expertise.</p>
      <h2>Historique</h2><table class="ev"><tr><th>Date</th><th>Action</th><th>Auteur</th><th>Commentaire</th></tr>${evenements}</table>
    </body></html>`;
  }
}
