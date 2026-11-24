import { secretJwt } from './configuration';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

/** Durée de validité par défaut d'un lien signé (2 h). */
const TTL_DEFAUT = 2 * 60 * 60;

/**
 * Liens signés à durée limitée (HMAC-SHA256) pour les ressources qu'un
 * navigateur ou une WebView charge sans pouvoir envoyer d'en-tête
 * Authorization : photos, signatures, scène 3D. Le lien n'est délivré
 * qu'à un utilisateur autorisé, et expire.
 */
@Injectable()
export class LiensSignesService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = secretJwt(config);
  }

  private signature(chemin: string, exp: number): string {
    return createHmac('sha256', this.secret).update(`${chemin}\n${exp}`).digest('base64url');
  }

  /** Paramètres `exp` et `sig` pour `chemin` (sans query string). */
  parametres(chemin: string, ttlSecondes = TTL_DEFAUT): { exp: number; sig: string } {
    const exp = Math.floor(Date.now() / 1000) + ttlSecondes;
    return { exp, sig: this.signature(chemin, exp) };
  }

  signer(chemin: string, ttlSecondes = TTL_DEFAUT): string {
    const { exp, sig } = this.parametres(chemin, ttlSecondes);
    return `${chemin}?exp=${exp}&sig=${sig}`;
  }

  verifier(chemin: string, exp: unknown, sig: unknown): boolean {
    const e = Number(exp);
    if (!Number.isFinite(e) || typeof sig !== 'string' || e < Date.now() / 1000) return false;
    const attendu = Buffer.from(this.signature(chemin, e));
    const recu = Buffer.from(sig);
    return attendu.length === recu.length && timingSafeEqual(attendu, recu);
  }

  /**
   * Les fichiers sont enregistrés en base sous `/uploads/...` ; les clients
   * reçoivent à la place un lien signé `/fichiers/...`.
   */
  fichier(url: string | null | undefined): string | null {
    if (!url) return null;
    if (!url.startsWith('/uploads/')) return url;
    return this.signer(`/fichiers/${url.slice('/uploads/'.length)}`);
  }

  /** Lien vers la visionneuse 3D interactive, avec un jeton de lecture de la scène. */
  scene(dossierId: string): string {
    const { exp, sig } = this.parametres(`/dossiers/${dossierId}/simulation3d/scene`);
    return `/simulation3d/scene.html?dossierId=${dossierId}&exp=${exp}&sig=${sig}`;
  }
}
