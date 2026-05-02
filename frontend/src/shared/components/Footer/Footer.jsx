import { Link } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import Container from '../../ui/Container';

const styles = {
  footer: [
    'mt-16 border-t border-[var(--header-border)]',
    'bg-[var(--bg-secondary)]/90 backdrop-blur',
  ].join(' '),
  desktop: 'hidden md:grid grid-cols-[2fr_1fr_1.4fr] gap-10 py-9',
  columnTitle: 'mb-3 font-semibold text-[var(--text-primary)]',
  text: 'text-sm text-[var(--text-secondary)]',
  list: 'space-y-2',
  listItem: 'text-sm text-[var(--text-secondary)] transition hover:text-[var(--primary-color)]',
  socials: 'mt-3 flex gap-2 text-sm text-[var(--text-secondary)]',
  copy: 'mt-4 text-xs text-[var(--text-muted)]',
  socialBadge: 'ui-badge',
  mobile: 'block md:hidden text-center py-8',
  mobileTitle: 'mb-4 text-xl font-bold text-[var(--text-primary)]',
  mobileContact: 'flex flex-col gap-1 text-sm text-[var(--text-secondary)]',
  mobileBottom: 'mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--text-muted)]',
};

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className={styles.footer}>
      <Container size="xxl" className={styles.desktop}>
        <div>
          <h4 className={styles.columnTitle}>{t('footer.about.title')}</h4>
          <p className={styles.text}>{t('footer.about.description')}</p>
          <p className={styles.copy}>{t('footer.copyright')}</p>
        </div>

        <div>
          <h4 className={styles.columnTitle}>{t('footer.quickLinks.title')}</h4>
          <ul className={styles.list}>
            <li><Link className={styles.listItem} to="/">{t('footer.quickLinks.home')}</Link></li>
            <li><Link className={styles.listItem} to="/media">{t('footer.quickLinks.media')}</Link></li>
            <li><Link className={styles.listItem} to="/groups">{t('footer.quickLinks.about')}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className={styles.columnTitle}>{t('footer.contact.title')}</h4>
          <p className={styles.text}>{t('footer.contact.email')}: example@email.com</p>
          <p className={styles.text}>{t('footer.contact.phone')}: +359 000 000</p>

          <div className={styles.socials}>
            <span className={styles.socialBadge}>FB</span>
            <span className={styles.socialBadge}>TW</span>
            <span className={styles.socialBadge}>IG</span>
          </div>
        </div>
      </Container>

      <Container className={styles.mobile}>
        <h3 className={styles.mobileTitle}>RATEOPLE</h3>

        <div className={styles.mobileContact}>
          <span>{t('footer.contact.phone')}: +359 000 000</span>
          <span>{t('footer.contact.email')}: example@email.com</span>
        </div>

        <div className={styles.mobileBottom}>
          <span>© 2024</span>
          <span>•</span>
          <span>{t('footer.mobile.privacy')}</span>
          <span>•</span>
          <span>{t('footer.mobile.terms')}</span>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
