import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Real session, enforced server-side via an httpOnly cookie checked at
// /api/auth/me — this route only mirrors that state for navigation.
export function ProtectedRoute() {
  const { isLoggedIn, isAuthLoading } = useAuth();

  // Wait for the initial /api/auth/me check before deciding — otherwise an
  // already-logged-in user would flash to /login on every page load.
  if (isAuthLoading) return null;

  return isLoggedIn ? <Outlet /> : <Navigate to="/login" replace />;
}
