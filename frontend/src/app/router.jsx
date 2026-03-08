import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import GroupLayout from '../layouts/GroupLayout';
import AdminLayout from '../layouts/AdminLayout';

import HomePage from '../pages/HomePage';
import LoginPage from '../features/auth/pages/LoginPage';
import RegisterPage from '../features/auth/pages/RegisterPage';
import MediaListPage from '../features/media/pages/MediaListPage';
import MediaDetailPage from '../pages/MediaDetailPage';
import WatchlistPage from '../pages/WatchlistPage';
import AccountPage from '../pages/AccountPage';
import SeasonManagerPage from '../features/media/pages/SeasonManagerPage';
import AddMediaPage from '../features/media/pages/AddMediaPage';
import CartPage from '../features/media/pages/CartPage';

const Router = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/media" element={<MediaListPage />} />
        <Route path="/media/add" element={<AddMediaPage />} />
        <Route path="/media/:id" element={<MediaDetailPage />} />
        <Route path="/media/:id/seasons" element={<SeasonManagerPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/watchlist" element={<WatchlistPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<GroupLayout />}>
        <Route path="/groups" element={<HomePage />} />
      </Route>

      <Route element={<AdminLayout />}>
        <Route path="/admin" element={<HomePage />} />
      </Route>

      <Route path="*" element={<HomePage />} />
    </Routes>
  );
};

export default Router;
