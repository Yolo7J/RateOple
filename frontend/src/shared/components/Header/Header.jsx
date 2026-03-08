import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAuth } from '../../../context/AuthContext';
import { useNotificationsQuery } from '../../../features/notifications/queries/useNotificationsQuery';
import NavigationDropdown from './NavigationDropdown';
import SearchBar from '../../ui/SearchBar/SearchBar';
import ThemeToggle from '../../ui/ThemeToggle/ThemeToggle';
import LanguageToggle from '../../ui/LanguageToggle/LanguageToggle';

import './Header.css';

const Header = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const { t } = useLanguage();
    const { user, logout } = useAuth();
    const { data: unreadData } = useNotificationsQuery({ unreadOnly: true, page: 1, pageSize: 1 }, Boolean(user));
    const navigate = useNavigate();
    const unreadCount = unreadData?.totalCount ?? 0;

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
        <header className="header">
            <div className="header-container">
                {isMobileMenuOpen && (
                    <div className="mobile-menu">
                        <NavigationDropdown />
                        <SearchBar />

                        <div className="mobile-auth">
                            {user ? (
                                <>
                                    <span className="mobile-greeting">
                                        {t('header.auth.hello', { username: user.username })}
                                    </span>
                                    <button onClick={() => handleAuthAction('account')}>
                                        Account
                                    </button>
                                    <button onClick={() => navigate('/account/watchlist')}>
                                        Watchlist
                                    </button>
                                    <button onClick={() => navigate('/notifications')}>
                                        Notifications
                                        {unreadCount > 0 ? <span className="header-notification-badge">{unreadCount}</span> : null}
                                    </button>
                                    <button onClick={() => handleAuthAction('logout')}>
                                        {t('header.auth.logout')}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => handleAuthAction('login')}>
                                        {t('header.auth.login')}
                                    </button>
                                    <button onClick={() => handleAuthAction('register')}>
                                        {t('header.auth.register')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Logo */}
                <div
                    className="header-logo"
                    onClick={() => navigate('/')}
                    style={{ cursor: 'pointer' }}
                >
                    <svg
                        className="logo-icon"
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
                    <span className="logo-text">{t('header.logo')}</span>
                </div>

                {/* Desktop Navigation */}
                <nav className="header-nav">
                    <NavigationDropdown />
                    <SearchBar />
                </nav>

                {/* Actions */}
                <div className="header-actions">
                    <ThemeToggle />
                    <LanguageToggle />

                    {/* Auth Buttons */}
                    <div className="auth-buttons">
                        {user ? (
                            <>
                                <span className="auth-greeting">
                                    {t('header.auth.hello', { username: user.username })}
                                </span>
                                <button
                                    className="auth-button"
                                    onClick={() => handleAuthAction('account')}
                                >
                                    Account
                                </button>
                                <button
                                    className="auth-button"
                                    onClick={() => navigate('/account/watchlist')}
                                >
                                    Watchlist
                                </button>
                                <button
                                    className="auth-button"
                                    onClick={() => navigate('/notifications')}
                                >
                                    Notifications
                                    {unreadCount > 0 ? <span className="header-notification-badge">{unreadCount}</span> : null}
                                </button>
                                <button
                                    className="auth-button logout-button"
                                    onClick={() => handleAuthAction('logout')}
                                >
                                    {t('header.auth.logout')}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    className="auth-button login-button"
                                    onClick={() => handleAuthAction('login')}
                                >
                                    {t('header.auth.login')}
                                </button>
                                <button
                                    className="auth-button register-button"
                                    onClick={() => handleAuthAction('register')}
                                >
                                    {t('header.auth.register')}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="mobile-menu-toggle"
                    aria-label="Toggle mobile menu"
                    onClick={() => setIsMobileMenuOpen(prev => !prev)}
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                    >
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
