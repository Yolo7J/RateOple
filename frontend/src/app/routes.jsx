// src/app/routes.jsx
import Home from '../pages/Home/Home'
// import About from '../pages/About/About'
// import Login from '../pages/Login/Login'
// import NotFound from '../pages/NotFound/NotFound'

export const routes = [
  {
    path: '/',
    element: <Home />,
    label: 'Home',
  },
]

export const fallbackRoute = {
  path: '*',

}
