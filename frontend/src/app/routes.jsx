import HomePage from '../pages/HomePage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import MediaListPage from '../pages/media/MediaListPage';
import MediaDetailPage from '../pages/MediaDetailPage';
import WatchlistPage from '../pages/WatchlistPage';
import AccountPage from '../pages/AccountPage';
import SeasonManagerPage from '../pages/media/SeasonManagerPage';
import AddMediaPage from '../pages/media/AddMediaPage';
import CartPage from '../pages/media/CartPage';

export const routes = [
    {
        path: '/',
        element: <HomePage />,
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
    {
        path: "/media/:id/seasons",
        element: <SeasonManagerPage/>
    },
    {
        path: '/account/watchlist',
        element: <WatchlistPage />,
    },
    {
        path: '/account',
        element: <AccountPage />,
    }
];

export const fallbackRoute = {
    path: '*',
    element: <HomePage />,
};
