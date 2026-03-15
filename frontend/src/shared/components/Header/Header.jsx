import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAuth } from '../../../context/AuthContext';
import { useNotificationsQuery } from '../../../features/notifications/queries/useNotificationsQuery';
import NavigationDropdown from './NavigationDropdown';
import SearchBar from '../../ui/SearchBar/SearchBar';
import ThemeToggle from '../../ui/ThemeToggle/ThemeToggle';
import LanguageToggle from '../../ui/LanguageToggle/LanguageToggle';
import Container from '../../ui/Container';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileUserOpen, setIsMobileUserOpen] = useState(false);
  const [isMobileMediaOpen, setIsMobileMediaOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const { data: unreadData } = useNotificationsQuery({ unreadOnly: true, page: 1, pageSize: 1 }, Boolean(user));
  const navigate = useNavigate();
  const unreadCount = unreadData?.totalCount ?? 0;
  const canModerate = Array.isArray(user?.roles)
    ? user.roles.some((role) => ['Moderator', 'Admin', 'SuperAdmin'].includes(role))
    : false;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleNavigate = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
    setIsMobileUserOpen(false);
    setIsMobileMediaOpen(false);
    setIsUserMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    handleNavigate('/');
  };

  const navLinks = [
    { label: t('header.navigation.home'), path: '/' },
    { label: 'Collections', path: '/collections' },
    { label: 'Groups', path: '/groups' },
  ];

  const mediaItems = [
    { label: t('header.navigation.movies'), path: '/media?types=Movie' },
    { label: t('header.navigation.books'), path: '/media?types=Book' },
    { label: t('header.navigation.tvShows'), path: '/media?types=TvSeries' },
  ];

  const userMenuItems = [
    { label: 'Account', path: '/account' },
    { label: 'Watchlist', path: '/account/watchlist' },
    { label: 'My collections', path: '/collections' },
  ];

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--header-border)] bg-[var(--header-bg)] shadow-sm backdrop-blur">
      <Container size="xxl" className="flex items-center gap-4 py-3 lg:py-4">
        <div className="md:hidden relative flex w-full items-center justify-between">
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] text-[var(--text-primary)] transition hover:border-[var(--primary-color)] hover:bg-[var(--button-hover-bg)]"
            aria-label="Open navigation"
            onClick={() => {
              setIsMobileMenuOpen(true);
              setIsMobileSearchOpen(false);
              setIsMobileUserOpen(false);
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <button
            className="absolute left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-2 py-1 text-[var(--text-primary)] transition hover:bg-[var(--button-hover-bg)]"
            onClick={() => handleNavigate('/')}
            aria-label={t('header.logo')}
          >
            <svg
              className="h-7 w-7 text-[var(--primary-color)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-lg font-semibold text-[var(--text-primary)]">{t('header.logo')}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] text-[var(--text-primary)] transition hover:border-[var(--primary-color)] hover:bg-[var(--button-hover-bg)]"
              aria-label="Search"
              onClick={() => {
                setIsMobileSearchOpen(true);
                setIsMobileMenuOpen(false);
                setIsMobileUserOpen(false);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--button-border)] bg-[var(--button-bg)] text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary-color)] hover:bg-[var(--button-hover-bg)]"
              aria-label="Account"
              onClick={() => {
                setIsMobileUserOpen(true);
                setIsMobileMenuOpen(false);
                setIsMobileSearchOpen(false);
              }}
            >
              {userInitial}
            </button>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-6">
          <button
            className="flex items-center gap-3 rounded-full px-2 py-1 text-[var(--text-primary)] transition hover:bg-[var(--button-hover-bg)]"
            onClick={() => handleNavigate('/')}
            aria-label={t('header.logo')}
          >
            <svg
              className="h-7 w-7 text-[var(--primary-color)] lg:h-8 lg:w-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-lg font-semibold text-[var(--text-primary)] lg:text-2xl">
              {t('header.logo')}
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-5 lg:gap-6">
            <button
              className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] lg:text-base"
              onClick={() => handleNavigate(navLinks[0].path)}
            >
              {navLinks[0].label}
            </button>
            <NavigationDropdown items={mediaItems} />
            {navLinks.slice(1).map((item) => (
              <button
                key={item.path}
                className="text-sm font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] lg:text-base"
                onClick={() => handleNavigate(item.path)}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="hidden md:flex flex-1 items-center justify-center px-2">
          <div className="w-full max-w-3xl xl:max-w-4xl">
            <SearchBar />
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 lg:gap-3">
          <ThemeToggle />
          <LanguageToggle />

          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] text-[var(--text-primary)] transition hover:border-[var(--primary-color)] hover:bg-[var(--button-hover-bg)] lg:h-11 lg:w-11"
            onClick={() => handleNavigate('/notifications')}
            aria-label="Notifications"
            title="Notifications"
          >
            <svg className="h-5 w-5 lg:h-6 lg:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 flex h-5 items-center justify-center rounded-full bg-[var(--primary-color)] px-1 text-xs font-semibold text-black">
                {unreadCount}
              </span>
            ) : null}
          </button>

          {user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--button-border)] bg-[var(--button-bg)] text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--primary-color)] hover:bg-[var(--button-hover-bg)] lg:h-11 lg:w-11 lg:text-base"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                aria-label="User menu"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
              >
                {userInitial}
              </button>

              {isUserMenuOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-[var(--dropdown-border)] bg-[var(--dropdown-bg)] shadow-lg"
                  role="menu"
                >
                  <div className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {t('header.auth.hello', { username: user.username })}
                  </div>
                  <div className="border-t border-[var(--dropdown-border)]" />
                  {userMenuItems.map((item) => (
                    <button
                      key={item.path}
                      className="flex w-full items-center px-4 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--dropdown-hover-bg)]"
                      onClick={() => handleNavigate(item.path)}
                      role="menuitem"
                    >
                      {item.label}
                    </button>
                  ))}
                  {canModerate ? (
                    <button
                      className="flex w-full items-center px-4 py-2 text-left text-sm text-[var(--text-primary)] transition hover:bg-[var(--dropdown-hover-bg)]"
                      onClick={() => handleNavigate('/admin')}
                      role="menuitem"
                    >
                      Moderation
                    </button>
                  ) : null}
                  <div className="border-t border-[var(--dropdown-border)]" />
                  <button
                    className="flex w-full items-center px-4 py-2 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--dropdown-hover-bg)]"
                    onClick={handleLogout}
                    role="menuitem"
                  >
                    {t('header.auth.logout')}
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-[var(--button-border)] bg-[var(--button-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--primary-color)] hover:bg-[var(--button-hover-bg)] lg:text-base"
                onClick={() => handleNavigate('/login')}
              >
                {t('header.auth.login')}
              </button>
              <button
                className="rounded-full bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 lg:text-base"
                onClick={() => handleNavigate('/register')}
              >
                {t('header.auth.register')}
              </button>
            </div>
          )}
        </div>

      </Container>

      <div
        className={`md:hidden fixed inset-0 z-50 transition ${
          isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!isMobileMenuOpen}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <div
          className={`absolute left-0 top-0 h-full w-[85%] max-w-sm bg-[var(--bg-secondary)] shadow-2xl transition-transform ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
            <span className="text-base font-semibold text-[var(--text-primary)]">Menu</span>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] text-[var(--text-primary)]"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-4">
            <div className="grid gap-2">
              <button
                className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                onClick={() => handleNavigate(navLinks[0].path)}
              >
                {navLinks[0].label}
              </button>

              <div className="rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)]">
                <button
                  className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                  onClick={() => setIsMobileMediaOpen((prev) => !prev)}
                >
                  <span>{t('header.navigation.media')}</span>
                  <svg
                    className={`h-4 w-4 transition ${isMobileMediaOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isMobileMediaOpen ? (
                  <div className="border-t border-[var(--border)] px-3 py-2">
                    <button
                      className="w-full rounded-md px-2 py-1 text-left text-sm text-[var(--text-secondary)] transition hover:bg-[var(--button-hover-bg)] hover:text-[var(--text-primary)]"
                      onClick={() => handleNavigate('/media')}
                    >
                      All media
                    </button>
                    {mediaItems.map((item) => (
                      <button
                        key={item.path}
                        className="w-full rounded-md px-2 py-1 text-left text-sm text-[var(--text-secondary)] transition hover:bg-[var(--button-hover-bg)] hover:text-[var(--text-primary)]"
                        onClick={() => handleNavigate(item.path)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {navLinks.slice(1).map((item) => (
                <button
                  key={item.path}
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                  onClick={() => handleNavigate(item.path)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Quick links</span>
              <button
                className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                onClick={() => handleNavigate('/account/watchlist')}
              >
                Watchlist
              </button>
              <button
                className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                onClick={() => handleNavigate('/notifications')}
              >
                <span>Notifications</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </button>
            </div>

            <div className="grid gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Settings</span>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <LanguageToggle />
              </div>
            </div>

            <div className="mt-auto grid gap-2 pb-6">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Account</span>
              {user ? (
                <>
                  <button
                    className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                    onClick={() => handleNavigate('/account')}
                  >
                    Profile
                  </button>
                  {userMenuItems.map((item) => (
                    <button
                      key={item.path}
                      className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                      onClick={() => handleNavigate(item.path)}
                    >
                      {item.label}
                    </button>
                  ))}
                  {canModerate ? (
                    <button
                      className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                      onClick={() => handleNavigate('/admin')}
                    >
                      Moderation
                    </button>
                  ) : null}
                  <button
                    className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                    onClick={handleLogout}
                  >
                    {t('header.auth.logout')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                    onClick={() => handleNavigate('/login')}
                  >
                    {t('header.auth.login')}
                  </button>
                  <button
                    className="flex w-full items-center justify-between rounded-lg bg-[var(--primary-color)] px-3 py-2 text-sm font-semibold text-black"
                    onClick={() => handleNavigate('/register')}
                  >
                    {t('header.auth.register')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        className={`md:hidden fixed inset-0 z-50 transition ${
          isMobileSearchOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!isMobileSearchOpen}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            isMobileSearchOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMobileSearchOpen(false)}
        />
        <div
          className={`absolute left-0 right-0 top-0 mx-auto w-full bg-[var(--bg-secondary)] shadow-xl transition-transform ${
            isMobileSearchOpen ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4">
            <span className="text-base font-semibold text-[var(--text-primary)]">Search</span>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] text-[var(--text-primary)]"
              onClick={() => setIsMobileSearchOpen(false)}
              aria-label="Close search"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="px-4 py-4">
            <SearchBar />
          </div>
        </div>
      </div>

      <div
        className={`md:hidden fixed inset-0 z-50 transition ${
          isMobileUserOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!isMobileUserOpen}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${
            isMobileUserOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setIsMobileUserOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-[80%] max-w-xs bg-[var(--bg-secondary)] shadow-2xl transition-transform ${
            isMobileUserOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-4">
            <span className="text-base font-semibold text-[var(--text-primary)]">Account</span>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] text-[var(--text-primary)]"
              onClick={() => setIsMobileUserOpen(false)}
              aria-label="Close account menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex h-full flex-col gap-2 overflow-y-auto px-4 py-4">
            {user ? (
              <>
                <span className="text-sm text-[var(--text-secondary)]">
                  {t('header.auth.hello', { username: user.username })}
                </span>
                <button
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                  onClick={() => handleNavigate('/account')}
                >
                  Profile
                </button>
                {userMenuItems.map((item) => (
                  <button
                    key={item.path}
                    className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                    onClick={() => handleNavigate(item.path)}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                  onClick={() => handleNavigate('/notifications')}
                >
                  Notifications
                </button>
                {canModerate ? (
                  <button
                    className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                    onClick={() => handleNavigate('/admin')}
                  >
                    Moderation
                  </button>
                ) : null}
                <button
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                  onClick={handleLogout}
                >
                  {t('header.auth.logout')}
                </button>
              </>
            ) : (
              <>
                <button
                  className="flex w-full items-center justify-between rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]"
                  onClick={() => handleNavigate('/login')}
                >
                  {t('header.auth.login')}
                </button>
                <button
                  className="flex w-full items-center justify-between rounded-lg bg-[var(--primary-color)] px-3 py-2 text-sm font-semibold text-black"
                  onClick={() => handleNavigate('/register')}
                >
                  {t('header.auth.register')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
