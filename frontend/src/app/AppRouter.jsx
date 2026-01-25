// src/app/AppRouter.jsx
import { Routes, Route } from 'react-router-dom'
import { routes, fallbackRoute } from './routes.jsx'

function AppRouter() {
  return (
    <Routes>
      {routes.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}

      <Route
        path={fallbackRoute.path}
        element={fallbackRoute.element}
      />
    </Routes>
  )
}

export default AppRouter
