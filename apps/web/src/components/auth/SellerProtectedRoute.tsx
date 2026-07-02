import { FC, ReactNode, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { PRODUCT_API_URL } from '../../config/api';

interface SellerProtectedRouteProps {
  children?: ReactNode;
}

export const SellerProtectedRoute: FC<SellerProtectedRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkSeller = async () => {
      const token = localStorage.getItem('c2c_token');
      if (!token) {
        if (mounted) setLoading(false);
        return;
      }
      
      let isShopFound = false;
      let apiStatus = null;

      try {
        const res = await fetch(`${PRODUCT_API_URL}/seller/context`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.shop) {
            isShopFound = true;
            apiStatus = data.shop.status;
          }
        }
      } catch (err) {
        console.error('Failed to verify seller context', err);
      }

      if (!mounted) return;

      const suspendedStatuses = ['suspended', 'banned', 'locked', 'rejected'];
      const pendingStatuses = ['pending', 'pending_approval'];

      if (isShopFound && apiStatus) {
        if (suspendedStatuses.includes(apiStatus.toLowerCase())) {
          setIsSuspended(true);
        } else if (pendingStatuses.includes(apiStatus.toLowerCase())) {
          setIsPending(true);
        } else {
          setIsAllowed(true);
        }
      } else {
        // Fallback to local storage if API failed but we technically have a shop 
        // (Prevents incorrect redirect to /register if API is just down)
        const userStr = localStorage.getItem('c2c_user');
        let localStatus = null;
        let hasLocalShop = false;
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user.shop) {
               hasLocalShop = true;
               localStatus = user.shop.status;
            }
          } catch (e) {}
        }

        if (hasLocalShop && localStatus && suspendedStatuses.includes(localStatus.toLowerCase())) {
           setIsSuspended(true);
        } else if (hasLocalShop && localStatus && pendingStatuses.includes(localStatus.toLowerCase())) {
           setIsPending(true);
        } else if (hasLocalShop && localStatus) {
           setIsAllowed(true);
        }
      }
      
      setLoading(false);
    };

    checkSeller();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5faff] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
      </div>
    );
  }

  const token = localStorage.getItem('c2c_token');
  const userStr = localStorage.getItem('c2c_user');
  
  if (!token || !userStr) {
    // Not logged in -> redirect to login
    return <Navigate to="/login" replace />;
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-[#f5faff] flex flex-col items-center justify-center font-['Inter']">
        <span className="material-symbols-outlined text-6xl text-[#ba1a1a] mb-4">gavel</span>
        <h2 className="text-2xl font-bold text-[#0f1d25] mb-2">Cửa hàng của bạn đã bị đình chỉ</h2>
        <p className="text-[#707882] mb-8 text-center max-w-md">Do vi phạm chính sách, kênh người bán của bạn đã tạm thời không khả dụng. Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết.</p>
        <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-[#00629d] text-white rounded-full font-bold">
          Về Trang chủ
        </button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center font-['Inter']">
        <span className="material-symbols-outlined text-6xl text-amber-500 mb-4">hourglass_empty</span>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Cửa hàng đang được xử lý</h2>
        <p className="text-slate-600 mb-8 text-center max-w-md">
          Hồ sơ của bạn đang chờ duyệt. Sau khi được chấp nhận, bạn có thể truy cập kênh người bán và đăng sản phẩm.
        </p>
        <button onClick={() => window.location.href = '/'} className="px-8 py-3 bg-[#1d4ed8] hover:bg-[#1e40af] transition text-white rounded-xl font-bold shadow-md">
          Về Trang chủ
        </button>
      </div>
    );
  }

  if (!isAllowed) {
    // Logged in but no shop registered or recognized -> redirect to shop registration
    return <Navigate to="/seller/register" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
