import DiscoveryPage from '../features/discovery/pages/DiscoveryPage';
import GroupsPage from '../features/groups/pages/GroupsPage';
import GroupDetailPage from '../features/groups/pages/GroupDetailPage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import MediaListPage from '../features/media/pages/MediaListPage';
import MediaDetailPage from '../features/media/pages/MediaDetailPage';
import CollectionsPage from '../features/collections/pages/CollectionsPage';
import CollectionDetailPage from '../features/collections/pages/CollectionDetailPage';
import NotificationsPage from '../features/notifications/pages/NotificationsPage';
import WatchlistPage from '../features/users/pages/WatchlistPage';
import AccountPage from '../features/users/pages/AccountPage';
import SeasonManagerPage from '../features/media/pages/SeasonManagerPage';
import AddMediaPage from '../features/media/pages/AddMediaPage';
import CartPage from '../features/media/pages/CartPage';
import ModerationPage from '../features/moderation/pages/ModerationPage';
import AuditLogPage from '../features/moderation/pages/AuditLogPage';
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage';
import AdminMediaPage from '../features/media/pages/AdminMediaPage';
import EditMediaPage from '../features/media/pages/EditMediaPage';

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
        path: '/groups',
        element: <GroupsPage />,
    },
    {
        path: '/groups/:id',
        element: <GroupDetailPage />,
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
        path: '/notifications',
        element: <NotificationsPage />,
    },
    {
        path: '/account',
        element: <AccountPage />,
    },
    {
        path: '/admin',
        element: <AdminDashboardPage />,
    },
    {
        path: '/admin/media',
        element: <AdminMediaPage />,
    },
    {
        path: '/admin/media/:id/edit',
        element: <EditMediaPage />,
    },
    {
        path: '/admin/moderation',
        element: <ModerationPage />,
    },
    {
        path: '/admin/moderation/audit-logs',
        element: <AuditLogPage />,
    },
];

export const fallbackRoute = {
    path: '*',
    element: <DiscoveryPage />,
};
