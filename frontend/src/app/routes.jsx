import Home from '../pages/Home/Home';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';

export const routes = [
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
];

export const fallbackRoute = {
  path: '*',
  element: <Home />, // or create NotFound later
};
