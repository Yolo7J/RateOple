import Header from './components/layout/Header/Header'
import Footer from './components/layout/Footer/Footer'
import './App.css'
import { useLanguage } from './hooks/useLanguage'

function App() {
  const { t } = useLanguage()

  return (
    <div className="app">
      <Header />

      <main className="main-content">
        <div className="welcome-section">
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
        </div>
      </main>
      <Footer/>
    </div>
  )
}

export default App
