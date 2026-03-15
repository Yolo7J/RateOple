import { useLanguage } from '../../../hooks/useLanguage';

const styles = {
  footer: [
    'mt-16 border-t border-[var(--header-border)]',
    'bg-[var(--header-bg)] shadow-[0_-2px_8px_var(--shadow-color)] backdrop-blur',
  ].join(' '),
  desktop: 'hidden md:grid max-w-[1400px] mx-auto grid-cols-[2fr_1fr_2fr] gap-12 px-8 py-10',
  columnTitle: 'mb-3 font-semibold text-[var(--text-primary)]',
  text: 'text-sm text-[var(--text-secondary)]',
  list: 'space-y-2',
  listItem: 'cursor-pointer text-sm text-[var(--text-secondary)] transition hover:text-[var(--primary-color)]',
  socials: 'mt-3 flex gap-3 text-sm text-[var(--text-secondary)]',
  copy: 'mt-4 text-xs text-[var(--text-muted)]',
  mobile: 'block md:hidden text-center px-6 py-8',
  mobileTitle: [
    'mb-4 text-xl font-bold',
    'bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)]',
    'bg-clip-text text-transparent',
  ].join(' '),
  mobileContact: 'flex flex-col gap-1 text-sm text-[var(--text-secondary)]',
  mobileBottom: 'mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-[var(--text-muted)]',
};

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className={styles.footer}>
      <div className={styles.desktop}>
        <div>
          <h4 className={styles.columnTitle}>{t('footer.about.title')}</h4>
          <p className={styles.text}>{t('footer.about.description')}</p>
          <p className={styles.copy}>{t('footer.copyright')}</p>
        </div>

        <div>
          <h4 className={styles.columnTitle}>{t('footer.quickLinks.title')}</h4>
          <ul className={styles.list}>
            <li className={styles.listItem}>{t('footer.quickLinks.home')}</li>
            <li className={styles.listItem}>{t('footer.quickLinks.media')}</li>
            <li className={styles.listItem}>{t('footer.quickLinks.about')}</li>
          </ul>
        </div>

        <div>
          <h4 className={styles.columnTitle}>{t('footer.contact.title')}</h4>
          <p className={styles.text}>{t('footer.contact.email')}: example@email.com</p>
          <p className={styles.text}>{t('footer.contact.phone')}: +359 000 000</p>

          <div className={styles.socials}>
            <span>[FB]</span>
            <span>[TW]</span>
            <span>[IG]</span>
          </div>
        </div>
      </div>

      <div className={styles.mobile}>
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
      </div>
    </footer>
  );
}

export default Footer;
