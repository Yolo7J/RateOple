import DiscoveryPage from '../features/discovery/pages/DiscoveryPage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import MediaListPage from '../features/media/pages/MediaListPage';
import MediaDetailPage from '../features/media/pages/MediaDetailPage';
import CollectionsPage from '../features/collections/pages/CollectionsPage';
import CollectionDetailPage from '../features/collections/pages/CollectionDetailPage';
import WatchlistPage from '../pages/WatchlistPage';
import AccountPage from '../pages/AccountPage';
import SeasonManagerPage from '../features/media/pages/SeasonManagerPage';
import AddMediaPage from '../features/media/pages/AddMediaPage';
import CartPage from '../features/media/pages/CartPage';

export const routes = [
    {
        path: '/',
        element: <DiscoveryPage />,
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
        path: '/collections',
        element: <CollectionsPage />,
    },
    {
        path: '/collections/:id',
        element: <CollectionDetailPage />,
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
    element: <DiscoveryPage />,
};
