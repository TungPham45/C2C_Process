import { FC, ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

interface BuyerProtectedRouteProps {
  children?: ReactNode;
}

export const BuyerProtectedRoute: FC<BuyerProtectedRouteProps> = ({ children }) => {
  const token = localStorage.getItem('c2c_token');
  const userStr = localStorage.getItem('c2c_user');

  // Must be logged in
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);

    // Admin không dùng luồng mua hàng
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }

    // Tài khoản bị khoá không được thanh toán/xem đơn
    if (user.status === 'suspended' || user.status === 'banned') {
      return <Navigate to="/" replace />;
    }
  } catch {
    return <Navigate to="/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

