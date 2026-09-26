import { NavLink, Outlet } from 'react-router';
import { Heart, Layers, LayoutGrid, Search } from 'lucide-react';
import { ThemeToggle } from '@/features/theme/ThemeProvider';
import { ActiveDeckTray } from '@/features/decks/ActiveDeckTray';
import { Toast } from '@/shared/ui/Toast';
import { strings } from '@/shared/i18n/pt-BR';
import styles from './App.module.css';

const nav = [
  { to: '/buscar', label: strings.nav.search, icon: Search },
  { to: '/decks', label: strings.nav.decks, icon: Layers },
  { to: '/colecao', label: strings.nav.collection, icon: LayoutGrid },
  { to: '/favoritos', label: strings.nav.favorites, icon: Heart },
] as const;

export function App() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandBlock}>
          <p className={styles.brand}>{strings.appName}</p>
          <p className={styles.tagline}>{strings.tagline}</p>
        </div>
        <nav className={styles.desktopNav} aria-label="Principal">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [styles.navLink, isActive ? styles.navActive : ''].join(' ')
              }
            >
              <item.icon size={18} aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.bottomNav} aria-label="Principal">
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [styles.bottomLink, isActive ? styles.navActive : ''].join(' ')
            }
          >
            <item.icon size={20} aria-hidden />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <ActiveDeckTray />
      <Toast />

      <footer className={styles.footer}>
        <p>{strings.common.attribution}</p>
      </footer>
    </div>
  );
}
