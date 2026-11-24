import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { mkdtemp, readFile, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

/**
 * Images JPEG réparties régulièrement sur la durée d'une vidéo (1280 px au
 * plus), pour les soumettre au modèle de vision.
 */
export async function extraireImages(chemin: string, dureeSecondes: number, nombre: number): Promise<Buffer[]> {
  const binaire: string | null = ffmpegPath;
  if (!binaire) throw new Error('ffmpeg introuvable');
  if (nombre <= 0 || !(dureeSecondes > 0)) return [];
  const dossier = await mkdtemp(join(tmpdir(), 'images-video-'));
  try {
    // Une image au milieu de chaque tranche : évite le début et la fin, souvent flous.
    const pas = dureeSecondes / nombre;
    for (let i = 0; i < nombre; i++) {
      await lancer(binaire, [
        '-hide_banner', '-nostdin', '-loglevel', 'error', '-protocol_whitelist', 'file,pipe',
        '-ss', ((i + 0.5) * pas).toFixed(2), '-i', chemin, '-frames:v', '1',
        '-vf', "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease", '-q:v', '4',
        join(dossier, `${String(i).padStart(2, '0')}.jpg`),
      ]);
    }
    const noms = (await readdir(dossier)).sort();
    return await Promise.all(noms.map((n) => readFile(join(dossier, n))));
  } finally {
    await rm(dossier, { recursive: true, force: true });
  }
}

function lancer(binaire: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(binaire, args, { timeout: 30_000 });
    let erreur = '';
    proc.stderr.on('data', (d: Buffer) => (erreur = (erreur + d.toString()).slice(-500)));
    proc.on('error', reject);
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg (${code}) : ${erreur}`))));
  });
}
