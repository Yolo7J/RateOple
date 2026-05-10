import { Link, Outlet } from 'react-router-dom';
import { BookOpen, MessageSquare, Star } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import LanguageToggle from '../shared/ui/LanguageToggle/LanguageToggle';
import ThemeToggle from '../shared/ui/ThemeToggle/ThemeToggle';
import '../features/auth/auth.css';

const AuthLayout = () => {
  const { t } = useLanguage();

  return (
    <div className="auth-shell">
      <header className="auth-topbar">
        <Link to="/" className="auth-brand-link" aria-label={t('header.logo')}>
          <span className="auth-brand-mark" aria-hidden="true">
            <Star className="h-5 w-5 fill-current" strokeWidth={2.35} />
          </span>
          <span className="auth-brand-copy">
            <span className="auth-brand-name">{t('header.logo')}</span>
            <span className="auth-brand-tagline">{t('auth.positioning')}</span>
          </span>
        </Link>

        <div className="auth-topbar-actions" aria-label={t('auth.preferences')}>
          <ThemeToggle />
          <LanguageToggle />
        </div>
      </header>

      <main className="auth-stage">
        <section className="auth-brand-panel" aria-label={t('auth.brandPanelLabel')}>
          <div className="auth-brand-panel__content">
            <div className="grid min-w-0 gap-5">
              <span className="auth-brand-panel__eyebrow">{t('auth.positioning')}</span>
              <div className="grid min-w-0 gap-4">
                <h1>{t('auth.heroTitle')}</h1>
                <p>{t('auth.heroSubtitle')}</p>
              </div>
            </div>

            <div className="auth-signal-grid" aria-label={t('auth.signalsLabel')}>
              <div className="auth-signal-card">
                <Star className="h-5 w-5" strokeWidth={2.35} aria-hidden="true" />
                <strong>{t('auth.signalRateTitle')}</strong>
                <span>{t('auth.signalRateText')}</span>
              </div>
              <div className="auth-signal-card">
                <BookOpen className="h-5 w-5" strokeWidth={2.35} aria-hidden="true" />
                <strong>{t('auth.signalReviewTitle')}</strong>
                <span>{t('auth.signalReviewText')}</span>
              </div>
              <div className="auth-signal-card">
                <MessageSquare className="h-5 w-5" strokeWidth={2.35} aria-hidden="true" />
                <strong>{t('auth.signalDiscussTitle')}</strong>
                <span>{t('auth.signalDiscussText')}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-form-panel">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default AuthLayout;
