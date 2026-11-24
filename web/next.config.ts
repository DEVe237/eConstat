import type { NextConfig } from 'next';

/** URL de l'API vue depuis le serveur Next.js (jamais exposée au navigateur). */
const API_INTERNE = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Le navigateur parle uniquement à ce site : /api/* est relayé vers l'API.
  // Même origine ⇒ le cookie de session httpOnly + SameSite=Strict fonctionne
  // sans CORS, et le jeton n'est jamais accessible au JavaScript de la page.
  async rewrites() {
    return [{ source: '/api/:chemin*', destination: `${API_INTERNE}/:chemin*` }];
  },
};

export default nextConfig;
