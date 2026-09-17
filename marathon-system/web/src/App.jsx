import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { GuestOnlyRoute, ProtectedRoute } from './components/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import EventListPage from './pages/EventListPage.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import MyRegistrationsPage from './pages/MyRegistrationsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminLayout from './pages/admin/AdminLayout.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import EventManagePage from './pages/admin/EventManagePage.jsx';
import EventFormPage from './pages/admin/EventFormPage.jsx';
import RegistrationManagePage from './pages/admin/RegistrationManagePage.jsx';
import UserManagePage from './pages/admin/UserManagePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ForbiddenPage from './pages/ForbiddenPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="events" element={<EventListPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />

        <Route element={<GuestOnlyRoute />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="my/registrations" element={<MyRegistrationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route element={<ProtectedRoute permission="event:read" />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="events" element={<EventManagePage />} />
            <Route path="events/new" element={<EventFormPage />} />
            <Route path="events/:id/edit" element={<EventFormPage />} />
            <Route path="registrations" element={<RegistrationManagePage />} />
            <Route path="users" element={<UserManagePage />} />
          </Route>
        </Route>

        <Route path="403" element={<ForbiddenPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
