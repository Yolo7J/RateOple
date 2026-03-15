import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAuth } from '../../../context/AuthContext';
import { useNotificationsQuery } from '../../../features/notifications/queries/useNotificationsQuery';
import NavigationDropdown from './NavigationDropdown';
import SearchBar from '../../ui/SearchBar/SearchBar';
import ThemeToggle from '../../ui/ThemeToggle/ThemeToggle';
import LanguageToggle from '../../ui/LanguageToggle/LanguageToggle';

const styles = {
  header: [
    'sticky top-0 z-50 w-full border-b border-[var(--header-border)]',
    'bg-[var(--header-bg)] shadow-[0_2px_8px_var(--shadow-color)] backdrop-blur',
  ].join(' '),
  container: 'mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-4 py-3 lg:px-8',
  logo: 'flex items-center gap-3 transition hover:scale-[1.03]',
  logoText: [
    'text-xl font-bold',
    'bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)]',
    'bg-clip-text text-transparent',
  ].join(' '),
  nav: 'hidden md:flex flex-1 items-center gap-4 lg:gap-6',
  actions: 'hidden md:flex items-center gap-3',
  authButtons: 'flex items-center gap-2',
  authButton: [
    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium',
    'transition',
  ].join(' '),
  authPrimary: [
    'border border-[var(--button-border)] bg-transparent text-[var(--text-primary)]',
    'hover:bg-[var(--button-hover-bg)] hover:border-[var(--primary-color)] hover:-translate-y-0.5',
  ].join(' '),
  authAccent: [
    'bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)]',
    'text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_var(--primary-color-alpha)]',
  ].join(' '),
  badge: [
    'ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full',
    'bg-[var(--primary-color)] text-[10px] font-bold text-[#111] h-5 px-1',
  ].join(' '),
  mobileToggle: [
    'md:hidden rounded-lg border border-[var(--button-border)] p-2 text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] hover:border-[var(--primary-color)]',
  ].join(' '),
  mobileMenu: [
    'absolute left-0 top-full z-40 w-full border-b border-[var(--header-border)]',
    'bg-[var(--header-bg)] p-4 shadow-[0_8px_24px_var(--shadow-color)]',
  ].join(' '),
  mobileStack: 'flex flex-col gap-4',
  mobileAuth: 'flex flex-wrap gap-2',
  mobileButton: [
    'flex-1 rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2',
    'text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--button-hover-bg)]',
  ].join(' '),
  mobileGreeting: 'w-full text-sm text-[var(--text-secondary)]',
};

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const { data: unreadData } = useNotificationsQuery({ unreadOnly: true, page: 1, pageSize: 1 }, Boolean(user));
  const navigate = useNavigate();
  const unreadCount = unreadData?.totalCount ?? 0;
  const canModerate = Array.isArray(user?.roles)
    ? user.roles.some((role) => ['Moderator', 'Admin', 'SuperAdmin'].includes(role))
    : false;

  const handleAuthAction = async (action) => {
    switch (action) {
      case 'login':
        navigate('/login');
        break;
      case 'register':
        navigate('/register');
        break;
      case 'account':
        navigate('/account');
        break;
      case 'logout':
        await logout();
        navigate('/');
        break;
      default:
        break;
    }

    setIsMobileMenuOpen(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {isMobileMenuOpen ? (
          <div className={styles.mobileMenu}>
            <div className={styles.mobileStack}>
              <NavigationDropdown />
              <SearchBar />

              <div className={styles.mobileAuth}>
                {user ? (
                  <>
                    <span className={styles.mobileGreeting}>
                      {t('header.auth.hello', { username: user.username })}
                    </span>
                    <button className={styles.mobileButton} onClick={() => handleAuthAction('account')}>
                      Account
                    </button>
                    <button className={styles.mobileButton} onClick={() => navigate('/account/watchlist')}>
                      Watchlist
                    </button>
                    <button className={styles.mobileButton} onClick={() => navigate('/notifications')}>
                      Notifications
                      {unreadCount > 0 ? <span className={styles.badge}>{unreadCount}</span> : null}
                    </button>
                    {canModerate ? (
                      <button className={styles.mobileButton} onClick={() => navigate('/admin')}>
                        Moderation
                      </button>
                    ) : null}
                    <button className={styles.mobileButton} onClick={() => handleAuthAction('logout')}>
                      {t('header.auth.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <button className={styles.mobileButton} onClick={() => handleAuthAction('login')}>
                      {t('header.auth.login')}
                    </button>
                    <button className={styles.mobileButton} onClick={() => handleAuthAction('register')}>
                      {t('header.auth.register')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className={styles.logo} onClick={() => navigate('/')} role="button" tabIndex={0}>
          <svg
            className="text-[var(--primary-color)]"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className={styles.logoText}>{t('header.logo')}</span>
        </div>

        <nav className={styles.nav}>
          <NavigationDropdown />
          <SearchBar />
        </nav>

        <div className={styles.actions}>
          <ThemeToggle />
          <LanguageToggle />

          <div className={styles.authButtons}>
            {user ? (
              <>
                <span className="text-sm text-[var(--text-secondary)]">
                  {t('header.auth.hello', { username: user.username })}
                </span>
                <button
                  className={`${styles.authButton} ${styles.authPrimary}`}
                  onClick={() => handleAuthAction('account')}
                >
                  Account
                </button>
                <button
                  className={`${styles.authButton} ${styles.authPrimary}`}
                  onClick={() => navigate('/account/watchlist')}
                >
                  Watchlist
                </button>
                <button
                  className={`${styles.authButton} ${styles.authPrimary}`}
                  onClick={() => navigate('/notifications')}
                >
                  Notifications
                  {unreadCount > 0 ? <span className={styles.badge}>{unreadCount}</span> : null}
                </button>
                {canModerate ? (
                  <button
                    className={`${styles.authButton} ${styles.authPrimary}`}
                    onClick={() => navigate('/admin')}
                  >
                    Moderation
                  </button>
                ) : null}
                <button
                  className={`${styles.authButton} ${styles.authAccent}`}
                  onClick={() => handleAuthAction('logout')}
                >
                  {t('header.auth.logout')}
                </button>
              </>
            ) : (
              <>
                <button
                  className={`${styles.authButton} ${styles.authPrimary}`}
                  onClick={() => handleAuthAction('login')}
                >
                  {t('header.auth.login')}
                </button>
                <button
                  className={`${styles.authButton} ${styles.authAccent}`}
                  onClick={() => handleAuthAction('register')}
                >
                  {t('header.auth.register')}
                </button>
              </>
            )}
          </div>
        </div>

        <button
          className={styles.mobileToggle}
          aria-label="Toggle mobile menu"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;
