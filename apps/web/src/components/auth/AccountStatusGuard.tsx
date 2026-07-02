import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AccountStatusGuardProps {
  children: React.ReactNode;
}

export const AccountStatusGuard: React.FC<AccountStatusGuardProps> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkStatus = async () => {
      const token = localStorage.getItem('c2c_token');
      // Do not check on public routes where user might not be logged in
      if (!token) return;

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('AccountStatusGuard check:', res.status);
        if (res.ok) {
          const user = await res.json();
          console.log('Current user status:', user.status);
          if (user.status === 'suspended' || user.status === 'banned') {
            setIsLocked(true);
          } else {
            setIsLocked(false);
          }
        } else if (res.status === 401 || res.status === 403) {
          // Token invalid or explicitly forbidden
          console.log('Token invalid, logging out');
          localStorage.removeItem('c2c_token');
          localStorage.removeItem('c2c_user');
          navigate('/login');
        }
      } catch (err) {
        console.error('Failed to check account status', err);
      }
    };

    // Check immediately on mount or when location changes
    checkStatus();

    // Also check periodically every 10 seconds just in case they are active
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('c2c_token');
    localStorage.removeItem('c2c_user');
    setIsLocked(false);
    navigate('/login');
    window.location.reload(); // Hard reload to clear any memory states
  };

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#0f1d25]/95 flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#d32f2f]"></div>
          
          <div className="w-20 h-20 bg-[#ffebee] rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-5xl text-[#d32f2f]">lock</span>
          </div>
          
          <h2 className="text-2xl font-black text-[#0f1d25] mb-3 font-['Plus_Jakarta_Sans']">Tài khoản bị khoá</h2>
          
          <p className="text-[#404751] mb-8 leading-relaxed">
            Tài khoản của bạn đã bị quản trị viên đình chỉ hoạt động do vi phạm quy tắc cộng đồng hoặc có hành vi bất thường. Vui lòng liên hệ bộ phận hỗ trợ để biết thêm chi tiết.
          </p>
          
          <button 
            onClick={handleLogout}
            className="w-full bg-[#d32f2f] hover:bg-[#b71c1c] text-white font-bold py-3.5 px-6 rounded-xl transition-colors shadow-sm"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
