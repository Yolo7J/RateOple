import Home from '../pages/Home/Home';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import MediaListPage from '../pages/media/MediaListPage';

import MediaDetailPage from '../pages/media/MediaDetailPage';
import AddMediaPage from '../pages/media/AddMediaPage';
import CartPage from '../pages/media/CartPage';

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
    {
        path: '/media',
        element: <MediaListPage />,
    },
    {
        path: '/media/add',
        element: <AddMediaPage />,
    },
    {
        path: '/media/:id',
        element: <MediaDetailPage />,
    },
    {
        path: '/cart',
        element: <CartPage />,
    },
];

export const fallbackRoute = {
    path: '*',
    element: <Home />,
};
