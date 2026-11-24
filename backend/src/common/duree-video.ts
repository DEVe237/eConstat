import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';

/**
 * Durée réelle d'une vidéo, lue par ffmpeg (la durée annoncée par le téléphone
 * n'est pas une preuve). `null` si le fichier n'est pas une vidéo lisible.
 */
export function mesurerDureeVideo(chemin: string): Promise<number | null> {
  const binaire: string | null = ffmpegPath;
  if (!binaire) return Promise.reject(new Error('ffmpeg introuvable'));
  return new Promise((resolve, reject) => {
    // Parcours complet du flux vidéo (sans décodage) : fiable même sans durée dans l'en-tête.
    const proc = spawn(
      binaire,
      ['-hide_banner', '-nostdin', '-protocol_whitelist', 'file,pipe', '-i', chemin, '-map', '0:v:0', '-c', 'copy', '-progress', 'pipe:1', '-f', 'null', '-'],
      { timeout: 60_000 },
    );
    let progres = '';
    let journal = '';
    proc.stdout.on('data', (d: Buffer) => (progres = (progres + d.toString()).slice(-4000)));
    proc.stderr.on('data', (d: Buffer) => (journal = (journal + d.toString()).slice(-20_000)));
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return resolve(null);
      const temps = [...progres.matchAll(/out_time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)].pop() ?? /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(journal);
      resolve(temps ? Number(temps[1]) * 3600 + Number(temps[2]) * 60 + Number(temps[3]) : null);
    });
  });
}
