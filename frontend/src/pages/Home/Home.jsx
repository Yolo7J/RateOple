import './Home.css'

import { useLanguage } from '../../hooks/useLanguage'
import { useTheme } from '../../hooks/useTheme'

function Home() {
  const { t } = useLanguage()
  const { theme } = useTheme()

  return (
    <>

      <main className={`main-content ${theme}`}>
        <section className="welcome-section">
          <h1>{t('home.title')}</h1>
          <p>{t('home.subtitle')}</p>

          <div className="feature-cards">
            <div className="feature-card">
              <h3>{t('home.features.books.title')}</h3>
              <p>{t('home.features.books.description')}</p>
            </div>

            <div className="feature-card">
              <h3>{t('home.features.movies.title')}</h3>
              <p>{t('home.features.movies.description')}</p>
            </div>

            <div className="feature-card">
              <h3>{t('home.features.tvShows.title')}</h3>
              <p>{t('home.features.tvShows.description')}</p>
            </div>
          </div>
        </section>
      </main>

    </>
  )
}


export default Home
