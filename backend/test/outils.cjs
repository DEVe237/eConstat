// Outils partagés par les tests de bout en bout.
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ffmpeg = require('ffmpeg-static');

/** Vraie vidéo MP4 (image unie) de la durée demandée, en secondes. */
function video(secondes) {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'econstat-'));
  const f = path.join(dossier, 'v.mp4');
  try {
    execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', `color=c=gray:s=64x48:r=5:d=${secondes}`, '-pix_fmt', 'yuv420p', f]);
    return fs.readFileSync(f);
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
}

const DOCUMENTS = ['carte_grise', 'visite_technique', 'assurance', 'cni', 'permis', 'autre_document'];
module.exports = { video, DOCUMENTS };
