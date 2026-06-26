import { FC, ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface AdminProtectedRouteProps {
  children?: ReactNode;
}

export const AdminProtectedRoute: FC<AdminProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('c2c_token');
  const userStr = localStorage.getItem('c2c_user');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      // Logged in but not admin -> redirect to home
      return <Navigate to="/" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
