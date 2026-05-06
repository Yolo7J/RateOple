import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  Bookmark,
  ChevronRight,
  Clapperboard,
  Film,
  Home,
  Layers,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Tv,
  User,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAuth } from '../../../context/AuthContext';
import { useNotificationsQuery } from '../../../features/notifications/queries/useNotificationsQuery';
import NavigationDropdown from './NavigationDropdown';
import SearchBar from '../../ui/SearchBar/SearchBar';
import ThemeToggle from '../../ui/ThemeToggle/ThemeToggle';
import LanguageToggle from '../../ui/LanguageToggle/LanguageToggle';
import Container from '../../ui/Container';

const formatUnreadCount = (count) => (count > 99 ? '99+' : String(count));

const BrandMark = ({ compact = false }) => (
  <span className={clsx('brand-mark', compact && 'brand-mark-compact')} aria-hidden="true">
    <Star className="h-4 w-4 fill-current" strokeWidth={2.4} />
  </span>
);

const BrandButton = ({ label, onClick, className, compact = false, showTagline = false }) => (
  <button type="button" className={clsx('header-brand', className)} onClick={onClick} aria-label={label}>
    <BrandMark compact={compact} />
    <span className="min-w-0">
      <span className={clsx('block truncate font-bold leading-none tracking-normal', compact ? 'text-lg' : 'text-xl')}>
        {label}
      </span>
      {showTagline ? (
        <span className="mt-1 hidden text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)] sm:block">
          Rate. Review. Discuss.
        </span>
      ) : null}
    </span>
  </button>
);

const HeaderActionButton = ({ children, className, ...props }) => (
  <button type="button" className={clsx('icon-button header-action-button', className)} {...props}>
    {children}
  </button>
);

const NotificationBadge = ({ count, pulse = false, className }) => {
  if (!count) return null;

  return (
    <span className={clsx('notification-badge', pulse && 'live-badge', className)}>
      {formatUnreadCount(count)}
    </span>
  );
};

const DesktopNavButton = ({ active = false, children, onClick }) => (
  <button
    type="button"
    className={clsx('nav-pill', active && 'nav-pill-active')}
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
  >
    {children}
  </button>
);

const MobileSection = ({ title, children }) => (
  <section className="grid gap-2">
    <h2 className="mobile-section-title">{title}</h2>
    <div className="grid gap-2">{children}</div>
  </section>
);

const MobileNavButton = ({
  icon: Icon,
  label,
  onClick,
  badgeCount = 0,
  active = false,
  primary = false,
  danger = false,
  showChevron = true,
}) => (
  <button
    type="button"
    className={clsx(
      'mobile-nav-item',
      active && 'mobile-nav-item-active',
      primary && 'mobile-nav-item-primary',
      danger && 'mobile-nav-item-danger',
    )}
    onClick={onClick}
    aria-current={active ? 'page' : undefined}
  >
    {Icon ? (
      <span className="mobile-nav-icon" aria-hidden="true">
        <Icon className="h-5 w-5" strokeWidth={2.2} />
      </span>
    ) : null}
    <span className="min-w-0 flex-1 truncate text-left">{label}</span>
    {badgeCount > 0 ? <NotificationBadge count={badgeCount} className="notification-badge-inline" /> : null}
    {showChevron ? <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" /> : null}
  </button>
);

const DesktopMenuButton = ({ icon, label, onClick, danger = false }) => {
  const MenuIcon = icon;

  return (
    <button
      type="button"
      className={clsx('desktop-menu-item', danger && 'desktop-menu-item-danger')}
      onClick={onClick}
      role="menuitem"
    >
      <span className="desktop-menu-icon" aria-hidden="true">
        <MenuIcon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <span>{label}</span>
    </button>
  );
};

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileUserOpen, setIsMobileUserOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [badgePulse, setBadgePulse] = useState(false);
  const userMenuRef = useRef(null);
  const prevUnreadRef = useRef(0);

  const { t } = useLanguage();
  const { user, logout } = useAuth();
  const { data: unreadData } = useNotificationsQuery({ unreadOnly: true, page: 1, pageSize: 1 }, Boolean(user));
  const navigate = useNavigate();
  const location = useLocation();
  const unreadCount = unreadData?.totalCount ?? 0;
  const isAdmin = Array.isArray(user?.roles)
    ? user.roles.some((role) => ['Admin', 'SuperAdmin'].includes(role))
    : false;
  const hasModerationAccess = Array.isArray(user?.roles)
    ? user.roles.some((role) => ['Admin', 'SuperAdmin', 'Moderator'].includes(role))
    : false;

  const closeMobilePanels = useCallback(() => {
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
    setIsMobileUserOpen(false);
  }, []);

  const openMobilePanel = useCallback((panel) => {
    setIsMobileMenuOpen(panel === 'menu');
    setIsMobileSearchOpen(panel === 'search');
    setIsMobileUserOpen(panel === 'account');
    setIsUserMenuOpen(false);
  }, []);

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

  useEffect(() => {
    const hasOpenMobilePanel = isMobileMenuOpen || isMobileSearchOpen || isMobileUserOpen;

    if (!hasOpenMobilePanel && !isUserMenuOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      closeMobilePanels();
      setIsUserMenuOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeMobilePanels, isMobileMenuOpen, isMobileSearchOpen, isMobileUserOpen, isUserMenuOpen]);

  useEffect(() => {
    const hasOpenMobilePanel = isMobileMenuOpen || isMobileSearchOpen || isMobileUserOpen;

    if (!hasOpenMobilePanel) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen, isMobileSearchOpen, isMobileUserOpen]);

  useEffect(() => {
    const prev = prevUnreadRef.current;
    if (unreadCount > prev) {
      const startTimer = setTimeout(() => setBadgePulse(true), 0);
      const endTimer = setTimeout(() => setBadgePulse(false), 700);
      prevUnreadRef.current = unreadCount;
      return () => {
        clearTimeout(startTimer);
        clearTimeout(endTimer);
      };
    }
    prevUnreadRef.current = unreadCount;
    return undefined;
  }, [unreadCount]);

  const handleNavigate = (path) => {
    navigate(path);
    closeMobilePanels();
    setIsUserMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    handleNavigate('/');
  };

  const isPathActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
  };

  const mediaItems = [
    { label: 'All Media', path: '/media', icon: LayoutGrid },
    { label: t('header.navigation.movies'), path: '/media?types=Movie', icon: Film },
    { label: t('header.navigation.tvShows'), path: '/media?types=TvSeries', icon: Tv },
    { label: t('header.navigation.books'), path: '/media?types=Book', icon: BookOpen },
  ];

  const desktopUserMenuItems = [
    { label: 'Account', path: '/account', icon: User },
    { label: 'Watchlist', path: '/account/watchlist', icon: Bookmark },
    { label: 'My collections', path: '/collections', icon: Layers },
  ];

  const personalItems = [
    { label: 'Account', path: '/account', icon: User },
    { label: 'Watchlist', path: '/account/watchlist', icon: Bookmark },
    { label: 'Notifications', path: '/notifications', icon: Bell, badgeCount: unreadCount },
  ];

  const adminItems = [
    ...(isAdmin
      ? [
          { label: 'Admin Dashboard', path: '/admin', icon: ShieldCheck },
          { label: 'Media Management', path: '/admin/media', icon: Clapperboard },
        ]
      : []),
    ...(hasModerationAccess ? [{ label: 'Moderation', path: '/admin/moderation', icon: ShieldCheck }] : []),
  ];

  const userInitial = user?.username ? user.username.charAt(0).toUpperCase() : 'U';
  const mediaActive = location.pathname === '/media';

  return (
    <header className="site-header">
      <Container size="xxl" className="flex min-w-0 items-center py-3">
        <div className="flex w-full min-w-0 items-center gap-2 xl:hidden">
          <HeaderActionButton
            aria-label="Open navigation"
            aria-expanded={isMobileMenuOpen}
            aria-haspopup="dialog"
            onClick={() => openMobilePanel('menu')}
          >
            <Menu className="h-6 w-6" strokeWidth={2.3} />
          </HeaderActionButton>

          <BrandButton
            label={t('header.logo')}
            compact
            className="min-w-0 flex-1 justify-center px-1 min-[380px]:justify-start"
            onClick={() => handleNavigate('/')}
          />

          <div className="flex shrink-0 items-center gap-1.5">
            <HeaderActionButton
              aria-label="Open search"
              aria-expanded={isMobileSearchOpen}
              aria-haspopup="dialog"
              onClick={() => openMobilePanel('search')}
            >
              <Search className="h-5 w-5" strokeWidth={2.3} />
            </HeaderActionButton>
            <HeaderActionButton
              className="relative"
              aria-label={user ? 'Open account menu' : 'Open sign in options'}
              aria-expanded={isMobileUserOpen}
              aria-haspopup="dialog"
              onClick={() => openMobilePanel('account')}
            >
              {user ? (
                <span className="avatar-initial avatar-initial-sm">{userInitial}</span>
              ) : (
                <User className="h-5 w-5" strokeWidth={2.3} />
              )}
              {user && unreadCount > 0 ? (
                <NotificationBadge count={unreadCount} pulse={badgePulse} className="-right-1 -top-1" />
              ) : null}
            </HeaderActionButton>
          </div>
        </div>

        <div className="hidden w-full min-w-0 items-center gap-4 xl:flex">
          <BrandButton
            label={t('header.logo')}
            showTagline
            className="shrink-0"
            onClick={() => handleNavigate('/')}
          />

          <nav className="flex shrink-0 items-center gap-1.5" aria-label="Primary navigation">
            <DesktopNavButton active={isPathActive('/')} onClick={() => handleNavigate('/')}>
              {t('header.navigation.home')}
            </DesktopNavButton>
            <NavigationDropdown items={mediaItems} active={mediaActive} />
            <DesktopNavButton active={isPathActive('/collections')} onClick={() => handleNavigate('/collections')}>
              Collections
            </DesktopNavButton>
            <DesktopNavButton active={isPathActive('/groups')} onClick={() => handleNavigate('/groups')}>
              Groups
            </DesktopNavButton>
          </nav>

          <div className="min-w-[18rem] flex-1">
            <SearchBar />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />

            <HeaderActionButton
              className="relative"
              onClick={() => handleNavigate('/notifications')}
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="h-5 w-5" strokeWidth={2.35} />
              <NotificationBadge count={unreadCount} pulse={badgePulse} className="-right-1 -top-1" />
            </HeaderActionButton>

            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  className="account-trigger"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  aria-label="User menu"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                >
                  <span className="avatar-initial">{userInitial}</span>
                </button>

                {isUserMenuOpen ? (
                  <div className="account-dropdown" role="menu">
                    <div className="account-dropdown-header">
                      <span className="avatar-initial avatar-initial-lg" aria-hidden="true">
                        {userInitial}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {t('header.auth.hello', { username: user.username })}
                        </p>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">Your ratings, lists, and settings</p>
                      </div>
                    </div>

                    <div className="py-2">
                      {desktopUserMenuItems.map((item) => (
                        <DesktopMenuButton
                          key={item.path}
                          icon={item.icon}
                          label={item.label}
                          onClick={() => handleNavigate(item.path)}
                        />
                      ))}
                    </div>

                    {hasModerationAccess ? (
                      <>
                        <div className="account-dropdown-divider" />
                        <div className="py-2">
                          {adminItems.map((item) => (
                            <DesktopMenuButton
                              key={item.path}
                              icon={item.icon}
                              label={item.label}
                              onClick={() => handleNavigate(item.path)}
                            />
                          ))}
                        </div>
                      </>
                    ) : null}

                    <div className="account-dropdown-divider" />
                    <div className="py-2">
                      <DesktopMenuButton icon={LogOut} label={t('header.auth.logout')} onClick={handleLogout} danger />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button type="button" className="auth-button" onClick={() => handleNavigate('/login')}>
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  {t('header.auth.login')}
                </button>
                <button type="button" className="auth-button auth-button-primary" onClick={() => handleNavigate('/register')}>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  {t('header.auth.register')}
                </button>
              </div>
            )}
          </div>
        </div>
      </Container>

      {isMobileMenuOpen ? (
        <div className="mobile-overlay xl:hidden" role="presentation">
          <div className="mobile-overlay-backdrop" onClick={closeMobilePanels} />
          <aside className="mobile-drawer mobile-drawer-left" role="dialog" aria-modal="true" aria-label="Mobile navigation">
            <div className="mobile-drawer-header">
              <BrandButton
                label={t('header.logo')}
                compact
                showTagline
                className="min-w-0"
                onClick={() => handleNavigate('/')}
              />
              <HeaderActionButton aria-label="Close navigation" onClick={closeMobilePanels}>
                <X className="h-5 w-5" strokeWidth={2.3} />
              </HeaderActionButton>
            </div>

            <div className="mobile-drawer-body">
              <div className="cinematic-surface p-3">
                <SearchBar onSearchComplete={closeMobilePanels} />
              </div>

              <MobileSection title="Explore">
                <MobileNavButton
                  icon={Home}
                  label={t('header.navigation.home')}
                  active={isPathActive('/')}
                  onClick={() => handleNavigate('/')}
                />
                {mediaItems.map((item) => (
                  <MobileNavButton
                    key={item.path}
                    icon={item.icon}
                    label={item.label}
                    active={item.path === '/media' ? mediaActive : false}
                    onClick={() => handleNavigate(item.path)}
                  />
                ))}
                <MobileNavButton
                  icon={Layers}
                  label="Collections"
                  active={isPathActive('/collections')}
                  onClick={() => handleNavigate('/collections')}
                />
                <MobileNavButton
                  icon={Users}
                  label="Groups"
                  active={isPathActive('/groups')}
                  onClick={() => handleNavigate('/groups')}
                />
              </MobileSection>

              {user ? (
                <MobileSection title="Personal">
                  {personalItems.map((item) => (
                    <MobileNavButton
                      key={item.path}
                      icon={item.icon}
                      label={item.label}
                      badgeCount={item.badgeCount}
                      onClick={() => handleNavigate(item.path)}
                    />
                  ))}
                </MobileSection>
              ) : null}

              {hasModerationAccess ? (
                <MobileSection title="Staff">
                  {adminItems.map((item) => (
                    <MobileNavButton
                      key={item.path}
                      icon={item.icon}
                      label={item.label}
                      onClick={() => handleNavigate(item.path)}
                    />
                  ))}
                </MobileSection>
              ) : null}

              <MobileSection title="Settings">
                <div className="mobile-setting-row">
                  <span className="flex items-center gap-3 text-sm font-semibold text-[var(--text-primary)]">
                    <Settings className="h-5 w-5 text-[var(--primary-color)]" aria-hidden="true" />
                    Appearance
                  </span>
                  <ThemeToggle showLabel />
                </div>
                <div className="mobile-setting-row">
                  <span className="flex items-center gap-3 text-sm font-semibold text-[var(--text-primary)]">
                    <Settings className="h-5 w-5 text-[var(--primary-color)]" aria-hidden="true" />
                    Language
                  </span>
                  <LanguageToggle align="left" />
                </div>
              </MobileSection>

              <MobileSection title="Account">
                {user ? (
                  <MobileNavButton
                    icon={LogOut}
                    label={t('header.auth.logout')}
                    onClick={handleLogout}
                    danger
                    showChevron={false}
                  />
                ) : (
                  <>
                    <MobileNavButton icon={LogIn} label={t('header.auth.login')} onClick={() => handleNavigate('/login')} />
                    <MobileNavButton
                      icon={UserPlus}
                      label={t('header.auth.register')}
                      onClick={() => handleNavigate('/register')}
                      primary
                    />
                  </>
                )}
              </MobileSection>
            </div>
          </aside>
        </div>
      ) : null}

      {isMobileSearchOpen ? (
        <div className="mobile-overlay xl:hidden" role="presentation">
          <div className="mobile-overlay-backdrop" onClick={closeMobilePanels} />
          <section className="mobile-search-sheet" role="dialog" aria-modal="true" aria-label="Search RateOple">
            <div className="mobile-drawer-header">
              <div>
                <p className="text-lg font-bold text-[var(--text-primary)]">Search RateOple</p>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Find movies, TV series, and books</p>
              </div>
              <HeaderActionButton aria-label="Close search" onClick={closeMobilePanels}>
                <X className="h-5 w-5" strokeWidth={2.3} />
              </HeaderActionButton>
            </div>
            <div className="p-4 sm:p-5">
              <SearchBar onSearchComplete={closeMobilePanels} autoFocus />
            </div>
          </section>
        </div>
      ) : null}

      {isMobileUserOpen ? (
        <div className="mobile-overlay xl:hidden" role="presentation">
          <div className="mobile-overlay-backdrop" onClick={closeMobilePanels} />
          <aside className="mobile-drawer mobile-drawer-right" role="dialog" aria-modal="true" aria-label="Account menu">
            <div className="mobile-drawer-header">
              <div className="flex min-w-0 items-center gap-3">
                {user ? (
                  <span className="avatar-initial avatar-initial-lg" aria-hidden="true">
                    {userInitial}
                  </span>
                ) : (
                  <BrandMark compact />
                )}
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-[var(--text-primary)]">
                    {user ? t('header.auth.hello', { username: user.username }) : 'Welcome to RateOple'}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {user ? 'Manage your profile and alerts' : 'Sign in to rate, review, and build your watchlist'}
                  </p>
                </div>
              </div>
              <HeaderActionButton aria-label="Close account menu" onClick={closeMobilePanels}>
                <X className="h-5 w-5" strokeWidth={2.3} />
              </HeaderActionButton>
            </div>

            <div className="mobile-drawer-body">
              {user ? (
                <>
                  <MobileSection title="Account">
                    {personalItems.map((item) => (
                      <MobileNavButton
                        key={item.path}
                        icon={item.icon}
                        label={item.label}
                        badgeCount={item.badgeCount}
                        onClick={() => handleNavigate(item.path)}
                      />
                    ))}
                    <MobileNavButton icon={Layers} label="My collections" onClick={() => handleNavigate('/collections')} />
                  </MobileSection>

                  {hasModerationAccess ? (
                    <MobileSection title="Staff">
                      {adminItems.map((item) => (
                        <MobileNavButton
                          key={item.path}
                          icon={item.icon}
                          label={item.label}
                          onClick={() => handleNavigate(item.path)}
                        />
                      ))}
                    </MobileSection>
                  ) : null}

                  <MobileSection title="Session">
                    <MobileNavButton
                      icon={LogOut}
                      label={t('header.auth.logout')}
                      onClick={handleLogout}
                      danger
                      showChevron={false}
                    />
                  </MobileSection>
                </>
              ) : (
                <MobileSection title="Start">
                  <MobileNavButton icon={LogIn} label={t('header.auth.login')} onClick={() => handleNavigate('/login')} />
                  <MobileNavButton
                    icon={UserPlus}
                    label={t('header.auth.register')}
                    onClick={() => handleNavigate('/register')}
                    primary
                  />
                </MobileSection>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </header>
  );
};

export default Header;
