import { Link } from 'react-router-dom';
import { Bell, BookOpen, Film, Layers, Star, Tv, User, Users } from 'lucide-react';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAuth } from '../../../context/AuthContext';
import Container from '../../ui/Container';

const FooterLink = ({ to, children }) => (
  <Link className="footer-link" to={to}>
    {children}
  </Link>
);

function Footer() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const exploreLinks = [
    { label: t('footer.links.home'), path: '/', icon: Star },
    { label: t('footer.links.media'), path: '/media', icon: Film },
    { label: t('footer.links.movies'), path: '/media?types=Movie', icon: Film },
    { label: t('footer.links.tvSeries'), path: '/media?types=TvSeries', icon: Tv },
    { label: t('footer.links.books'), path: '/media?types=Book', icon: BookOpen },
  ];

  const communityLinks = [
    { label: t('footer.links.collections'), path: '/collections', icon: Layers },
    { label: t('footer.links.groups'), path: '/groups', icon: Users },
    ...(user ? [{ label: t('footer.links.notifications'), path: '/notifications', icon: Bell }] : []),
  ];

  const accountLinks = user
    ? [
        { label: t('footer.links.account'), path: '/account', icon: User },
        { label: t('footer.links.watchlist'), path: '/account/watchlist', icon: Star },
      ]
    : [
        { label: t('header.auth.login'), path: '/login', icon: User },
        { label: t('header.auth.register'), path: '/register', icon: Star },
      ];

  return (
    <footer className="site-footer">
      <Container size="xxl" className="py-8 sm:py-10 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[1.5fr_2fr] lg:gap-12">
          <div className="max-w-xl">
            <Link className="footer-brand" to="/" aria-label={t('header.logo')}>
              <span className="brand-mark" aria-hidden="true">
                <Star className="h-4 w-4 fill-current" strokeWidth={2.4} />
              </span>
              <span>{t('header.logo')}</span>
            </Link>
            <p className="mt-4 max-w-md text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              {t('footer.brand.description')}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="footer-pill">{t('footer.pills.track')}</span>
              <span className="footer-pill">{t('footer.pills.rate')}</span>
              <span className="footer-pill">{t('footer.pills.discuss')}</span>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <h2 className="footer-heading">{t('footer.sections.explore')}</h2>
              <ul className="mt-3 grid gap-2.5">
                {exploreLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.path}>
                      <FooterLink to={link.path}>
                        <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                        {link.label}
                      </FooterLink>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <h2 className="footer-heading">{t('footer.sections.community')}</h2>
              <ul className="mt-3 grid gap-2.5">
                {communityLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.path}>
                      <FooterLink to={link.path}>
                        <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                        {link.label}
                      </FooterLink>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <h2 className="footer-heading">{t('footer.sections.account')}</h2>
              <ul className="mt-3 grid gap-2.5">
                {accountLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.path}>
                      <FooterLink to={link.path}>
                        <Icon className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                        {link.label}
                      </FooterLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>{t('footer.copyright')}</span>
          <span className="hidden h-1 w-1 rounded-full bg-[var(--text-muted)] sm:block" aria-hidden="true" />
          <span>{t('footer.legal.privacy')}</span>
          <span>{t('footer.legal.terms')}</span>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
