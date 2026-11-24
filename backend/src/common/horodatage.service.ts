import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

export interface Horodatage {
  /** Réponse RFC 3161 complète (TimeStampResp, DER) encodée en base64 : la preuve à conserver. */
  jeton: string;
  date: Date;
  autorite: string;
}

// --- encodage DER minimal ---------------------------------------------------
const longueur = (n: number): Buffer => {
  if (n < 0x80) return Buffer.from([n]);
  const octets: number[] = [];
  for (let v = n; v > 0; v >>= 8) octets.unshift(v & 0xff);
  return Buffer.from([0x80 | octets.length, ...octets]);
};
const tlv = (tag: number, contenu: Buffer) => Buffer.concat([Buffer.from([tag]), longueur(contenu.length), contenu]);
const sequence = (...elements: Buffer[]) => tlv(0x30, Buffer.concat(elements));
const entier = (octets: Buffer) => tlv(0x02, octets[0] & 0x80 ? Buffer.concat([Buffer.from([0]), octets]) : octets);
const OID_SHA256 = Buffer.from('0609608648016503040201', 'hex');

/** Lit l'en-tête TLV à `pos` : [tag, début du contenu, longueur]. */
function lireTlv(buf: Buffer, pos: number): [number, number, number] {
  const tag = buf[pos];
  let l = buf[pos + 1];
  let debut = pos + 2;
  if (l & 0x80) {
    const n = l & 0x7f;
    l = 0;
    for (let i = 0; i < n; i++) l = (l << 8) | buf[pos + 2 + i];
    debut += n;
  }
  return [tag, debut, l];
}

/**
 * Horodatage certifié RFC 3161 (cahier des charges §7 — « intégrité garantie
 * des dossiers (hash, horodatage certifié) »). Désactivé si TSA_URL est vide.
 * Pour une valeur légale, TSA_URL doit désigner une autorité d'horodatage
 * reconnue par la réglementation camerounaise.
 */
@Injectable()
export class HorodatageService {
  private readonly logger = new Logger(HorodatageService.name);

  constructor(private readonly config: ConfigService) {}

  requete(empreinteHex: string): Buffer {
    const empreinte = Buffer.from(empreinteHex, 'hex');
    return sequence(
      entier(Buffer.from([1])),
      sequence(sequence(OID_SHA256, Buffer.from([0x05, 0x00])), tlv(0x04, empreinte)),
      entier(randomBytes(8)),
      Buffer.from([0x01, 0x01, 0xff]),
    );
  }

  /** Statut PKI de la réponse (0 = accordé, 1 = accordé avec modifications). */
  static statut(reponse: Buffer): number {
    const [, debutResp] = lireTlv(reponse, 0); // TimeStampResp
    const [, debutStatut] = lireTlv(reponse, debutResp); // PKIStatusInfo
    const [tag, debutEntier, l] = lireTlv(reponse, debutStatut);
    if (tag !== 0x02) return -1;
    return reponse.subarray(debutEntier, debutEntier + l).readUIntBE(0, l);
  }

  /** genTime du TSTInfo : premier GeneralizedTime (AAAAMMJJhhmmss[.fff]Z) de la réponse. */
  static dateCertifiee(reponse: Buffer): Date | null {
    for (let i = 0; i < reponse.length - 17; i++) {
      if (reponse[i] !== 0x18) continue;
      const l = reponse[i + 1];
      if (l < 15 || l > 24) continue;
      const texte = reponse.subarray(i + 2, i + 2 + l).toString('latin1');
      const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\.\d+)?Z$/.exec(texte);
      if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ?? ''}Z`);
    }
    return null;
  }

  async horodater(empreinteHex: string): Promise<Horodatage | null> {
    const url = this.config.get<string>('TSA_URL');
    if (!url) return null;
    try {
      const reponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/timestamp-query' },
        body: new Uint8Array(this.requete(empreinteHex)),
        signal: AbortSignal.timeout(10_000),
      });
      if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
      const der = Buffer.from(await reponse.arrayBuffer());
      const statut = HorodatageService.statut(der);
      if (statut !== 0 && statut !== 1) throw new Error(`horodatage refusé (statut ${statut})`);
      return { jeton: der.toString('base64'), date: HorodatageService.dateCertifiee(der) ?? new Date(), autorite: new URL(url).host };
    } catch (err) {
      // L'horodatage renforce la preuve mais ne doit jamais bloquer la transmission d'un constat.
      this.logger.warn(`Horodatage impossible (${url}) : ${(err as Error).message}`);
      return null;
    }
  }
}
