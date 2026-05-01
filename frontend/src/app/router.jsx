import { Suspense, createElement, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import GroupLayout from '../layouts/GroupLayout';
import AdminLayout from '../layouts/AdminLayout';
import RequireAuth from '../features/auth/components/RequireAuth';
import RequireGuest from '../features/auth/components/RequireGuest';
import RequireRole from '../features/auth/components/RequireRole';
import RouteFallback from '../shared/ui/RouteFallback';

const DiscoveryPage = lazy(() => import('../features/discovery/pages/DiscoveryPage'));
const GroupsPage = lazy(() => import('../features/groups/pages/GroupsPage'));
const GroupDetailPage = lazy(() => import('../features/groups/pages/GroupDetailPage'));
const CreateGroupPage = lazy(() => import('../features/groups/pages/CreateGroupPage'));
const GroupPostDetailPage = lazy(() => import('../features/groups/pages/GroupPostDetailPage'));
const LoginPage = lazy(() => import('../features/auth/pages/LoginPage'));
const RegisterPage = lazy(() => import('../features/auth/pages/RegisterPage'));
const MediaListPage = lazy(() => import('../features/media/pages/MediaListPage'));
const MediaDetailPage = lazy(() => import('../features/media/pages/MediaDetailPage'));
const CollectionsPage = lazy(() => import('../features/collections/pages/CollectionsPage'));
const CollectionDetailPage = lazy(() => import('../features/collections/pages/CollectionDetailPage'));
const NotificationsPage = lazy(() => import('../features/notifications/pages/NotificationsPage'));
const WatchlistPage = lazy(() => import('../features/users/pages/WatchlistPage'));
const AccountPage = lazy(() => import('../features/users/pages/AccountPage'));
const SeasonManagerPage = lazy(() => import('../features/media/pages/SeasonManagerPage'));
const AddMediaPage = lazy(() => import('../features/media/pages/AddMediaPage'));
const CartPage = lazy(() => import('../features/media/pages/CartPage'));
const ModerationPage = lazy(() => import('../features/moderation/pages/ModerationPage'));
const AuditLogPage = lazy(() => import('../features/moderation/pages/AuditLogPage'));
const AdminDashboardPage = lazy(() => import('../features/admin/pages/AdminDashboardPage'));
const AdminMediaPage = lazy(() => import('../features/media/pages/AdminMediaPage'));
const EditMediaPage = lazy(() => import('../features/media/pages/EditMediaPage'));

const renderLazyRoute = (LazyPage) => (
  <Suspense fallback={<RouteFallback />}>
    {createElement(LazyPage)}
  </Suspense>
);

const Router = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={renderLazyRoute(DiscoveryPage)} />
        <Route path="/media" element={renderLazyRoute(MediaListPage)} />
        <Route path="/media/:id" element={renderLazyRoute(MediaDetailPage)} />
        <Route path="/collections" element={renderLazyRoute(CollectionsPage)} />
        <Route path="/collections/:id" element={renderLazyRoute(CollectionDetailPage)} />
        <Route element={<RequireAuth />}>
          <Route element={<RequireRole allow={['Admin', 'SuperAdmin']} />}>
            <Route path="/media/add" element={renderLazyRoute(AddMediaPage)} />
          </Route>
          <Route path="/media/:id/seasons" element={renderLazyRoute(SeasonManagerPage)} />
          <Route path="/cart" element={renderLazyRoute(CartPage)} />
          <Route path="/account" element={renderLazyRoute(AccountPage)} />
          <Route path="/account/watchlist" element={renderLazyRoute(WatchlistPage)} />
          <Route path="/notifications" element={renderLazyRoute(NotificationsPage)} />
        </Route>
      </Route>

      <Route element={<RequireGuest />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={renderLazyRoute(LoginPage)} />
          <Route path="/register" element={renderLazyRoute(RegisterPage)} />
        </Route>
      </Route>

      <Route element={<GroupLayout />}>
        <Route path="/groups" element={renderLazyRoute(GroupsPage)} />
        <Route path="/groups/:id" element={renderLazyRoute(GroupDetailPage)} />
        <Route path="/groups/:groupId/posts/:postId" element={renderLazyRoute(GroupPostDetailPage)} />
        <Route element={<RequireAuth />}>
          <Route path="/groups/new" element={renderLazyRoute(CreateGroupPage)} />
        </Route>
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route element={<RequireRole allow={['Admin', 'SuperAdmin']} />}>
            <Route path="/admin" element={renderLazyRoute(AdminDashboardPage)} />
            <Route path="/admin/media" element={renderLazyRoute(AdminMediaPage)} />
            <Route path="/admin/media/:id/edit" element={renderLazyRoute(EditMediaPage)} />
          </Route>
          <Route element={<RequireRole allow={['Admin', 'SuperAdmin', 'Moderator']} />}>
            <Route path="/admin/moderation" element={renderLazyRoute(ModerationPage)} />
            <Route path="/admin/moderation/audit-logs" element={renderLazyRoute(AuditLogPage)} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={renderLazyRoute(DiscoveryPage)} />
    </Routes>
  );
};

export default Router;
