import type { Metadata } from 'next';
import { Geist, JetBrains_Mono } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: 'eConstat — Dashboard autorités',
  description: 'Consultation et validation des constats d’accident transmis par l’application eConstat.',
};

// Appliqué avant le premier affichage pour éviter un éclair clair en mode sombre.
const THEME = `try{var t=localStorage.getItem('theme');if(t==='sombre'||(t==='systeme'&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${geist.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME }} />
      </head>
      <body className="font-sans antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
