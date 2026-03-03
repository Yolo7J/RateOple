// Header.jsx

import { useState } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import NavigationDropdown from './NavigationDropdown';
import SearchBar from '../../ui/SearchBar/SearchBar';
import ThemeToggle from '../../ui/ThemeToggle/ThemeToggle';
import LanguageToggle from '../../ui/LanguageToggle/LanguageToggle';
import { useNavigate } from 'react-router-dom';

import './Header.css';

const Header = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Mock authentication state - TODO: Replace with actual auth context
    // TEMP mock auth state
const isAuthenticated = false; 
// TODO: Replace with AuthContext later

    const { t } = useLanguage();

    const navigate = useNavigate();

const handleAuthAction = (action) => {
    switch (action) {
        case 'login':
            navigate('/login');
            break;
        case 'register':
            navigate('/register');
            break;
        case 'account':
            navigate('/account'); // future
            break;
        case 'logout':
            console.log('TODO: implement logout');
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
      {!isAuthenticated ? (
        <>
          <button onClick={() => handleAuthAction('login')}>
            {t('header.auth.login')}
          </button>
          <button onClick={() => handleAuthAction('register')}>
            {t('header.auth.register')}
          </button>
        </>
      ) : (
        <button onClick={() => handleAuthAction('logout')}>
          {t('header.auth.logout')}
        </button>
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
                        {isAuthenticated ? (
                            <>
                                <button
                                    className="auth-button account-button"
                                    onClick={() => handleAuthAction('account')}
                                >
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                    <span className="button-text">{t('header.auth.account')}</span>
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
