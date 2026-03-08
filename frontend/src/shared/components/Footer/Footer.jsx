import './Footer.css'
import { useLanguage } from '../../../hooks/useLanguage'

function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="footer">
      {/* DESKTOP FOOTER */}
      <div className="footer-desktop">
        <div className="footer-column">
          <h4>{t('footer.about.title')}</h4>
          <p>{t('footer.about.description')}</p>
          <p className="footer-copy">{t('footer.copyright')}</p>
        </div>

        <div className="footer-column">
          <h4>{t('footer.quickLinks.title')}</h4>
          <ul>
            <li>{t('footer.quickLinks.home')}</li>
            <li>{t('footer.quickLinks.media')}</li>
            <li>{t('footer.quickLinks.about')}</li>
          </ul>
        </div>

        <div className="footer-column">
          <h4>{t('footer.contact.title')}</h4>
          <p>{t('footer.contact.email')}: example@email.com</p>
          <p>{t('footer.contact.phone')}: +359 000 000</p>

          <div className="footer-socials">
            <span>[FB]</span>
            <span>[TW]</span>
            <span>[IG]</span>
          </div>
        </div>
      </div>

      {/* MOBILE FOOTER */}
      <div className="footer-mobile">
        <h3>RATEOPLE</h3>

        <div className="footer-mobile-contact">
          <span>{t('footer.contact.phone')}: +359 000 000</span>
          <span>{t('footer.contact.email')}: example@email.com</span>
        </div>

        <div className="footer-mobile-bottom">
          <span>© 2024</span>
          <span>•</span>
          <span>{t('footer.mobile.privacy')}</span>
          <span>•</span>
          <span>{t('footer.mobile.terms')}</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer
