import Header from './components/layout/Header/Header'
import './App.css'

function App() {
  return (
    <div className="app">
      <Header />
      <main className="main-content">
        <div className="welcome-section">
          <h1>Welcome to RateOple</h1>
          <p>Your platform for rating and reviewing media content</p>
          <div className="feature-cards">
            <div className="feature-card">
              <h3>📚 Books</h3>
              <p>Discover and rate your favorite books</p>
            </div>
            <div className="feature-card">
              <h3>🎬 Movies</h3>
              <p>Share your thoughts on the latest films</p>
            </div>
            <div className="feature-card">
              <h3>📺 TV Shows</h3>
              <p>Review your favorite series</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
