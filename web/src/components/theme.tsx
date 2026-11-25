'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export type Theme = 'clair' | 'sombre' | 'systeme';
export const THEMES: { valeur: Theme; libelle: string; Icone: typeof Sun }[] = [
  { valeur: 'clair', libelle: 'Clair', Icone: Sun },
  { valeur: 'sombre', libelle: 'Sombre', Icone: Moon },
  { valeur: 'systeme', libelle: 'Système', Icone: Laptop },
];

const lire = (): Theme => {
  try {
    return (localStorage.getItem('theme') as Theme | null) ?? 'clair';
  } catch {
    return 'clair';
  }
};
const systemeSombre = () => window.matchMedia('(prefers-color-scheme: dark)');
const appliquer = (t: Theme) => document.documentElement.classList.toggle('dark', t === 'sombre' || (t === 'systeme' && systemeSombre().matches));

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('clair');
  useEffect(() => {
    const sync = () => setTheme(lire());
    sync();
    const media = systemeSombre();
    const suivre = () => appliquer(lire());
    media.addEventListener('change', suivre);
    window.addEventListener('theme', sync);
    return () => {
      media.removeEventListener('change', suivre);
      window.removeEventListener('theme', sync);
    };
  }, []);
  const changer = (t: Theme) => {
    try {
      localStorage.setItem('theme', t);
    } catch {
      /* stockage indisponible : le choix vaut pour cette page */
    }
    appliquer(t);
    setTheme(t);
    window.dispatchEvent(new Event('theme'));
  };
  return { theme, changer };
}

/** Bascule clair / sombre. */
export function BoutonTheme() {
  const { changer } = useTheme();
  return (
    <button
      type="button"
      title="Thème clair ou sombre"
      aria-label="Changer de thème"
      onClick={() => changer(document.documentElement.classList.contains('dark') ? 'clair' : 'sombre')}
      className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      <Sun className="size-4.5 dark:hidden" />
      <Moon className="hidden size-4.5 dark:block" />
    </button>
  );
}
