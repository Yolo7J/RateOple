import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import GroupLayout from '../layouts/GroupLayout';
import AdminLayout from '../layouts/AdminLayout';
import RequireAuth from '../features/auth/components/RequireAuth';
import RequireGuest from '../features/auth/components/RequireGuest';
import RequireRole from '../features/auth/components/RequireRole';

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

const Router = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DiscoveryPage />} />
        <Route path="/media" element={<MediaListPage />} />
        <Route path="/media/:id" element={<MediaDetailPage />} />
        <Route path="/collections" element={<CollectionsPage />} />
        <Route path="/collections/:id" element={<CollectionDetailPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/media/add" element={<AddMediaPage />} />
          <Route path="/media/:id/seasons" element={<SeasonManagerPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/watchlist" element={<WatchlistPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      <Route element={<RequireGuest />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      <Route element={<GroupLayout />}>
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/groups/:id" element={<GroupDetailPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<RequireRole allow={['Moderator', 'Admin', 'SuperAdmin']} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<ModerationPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<DiscoveryPage />} />
    </Routes>
  );
};

export default Router;
