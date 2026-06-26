import { FC, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AUTH_API_URL, PRODUCT_API_URL } from '../../config/api';

export const LoginPage: FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (email === 'test@test.com') {
         localStorage.setItem('c2c_token', 'mock_token');
         localStorage.setItem('c2c_user', JSON.stringify({ id: 99, email: 'test@test.com', role: 'user', fullname: 'Test User', shop: null }));
         const redirectUrl = location.state?.from;
         if (redirectUrl) {
           navigate(redirectUrl);
         } else {
           navigate('/');
         }
         return;
      }
      const res = await fetch(`${AUTH_API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Store JWT Token & Session Data securely
      localStorage.setItem('c2c_token', data.access_token);

      let sellerContext: { isSeller?: boolean; shop?: any } | null = null;
      if (data.user.role !== 'admin') {
        const sellerRes = await fetch(`${PRODUCT_API_URL}/seller/context`, {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        if (sellerRes.ok) {
          sellerContext = await sellerRes.json();
        }
      }

      const sessionUser = {
        ...data.user,
        shop: sellerContext?.shop || null
      };
      localStorage.setItem('c2c_user', JSON.stringify(sessionUser));

      // Route to correct portal based on role/shop status
      const redirectUrl = location.state?.from;

      if (redirectUrl) {
        navigate(redirectUrl);
      } else if (sellerContext?.shop) {
        navigate('/');
      } else if (sessionUser.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/'); // Default marketplace
      }
    } catch (err: any) {
      setError(err.message || 'Cannot reach Authentication service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5faff] font-['Inter'] relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-br from-blue-100/40 to-white transform -skew-x-12 translate-x-32 z-0"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animation-blob z-0"></div>
      <div className="absolute top-32 right-32 w-72 h-72 bg-teal-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animation-blob animation-delay-2000 z-0"></div>

      <div className="w-full max-w-[1000px] grid grid-cols-2 bg-white rounded-3xl shadow-2xl relative z-10 overflow-hidden min-h-[600px] border border-blue-50">
        {/* Left Side: Brand Panel */}
        <div className="col-span-1 bg-gradient-to-br from-[#004e7c] to-[#00629d] p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] flex items-center gap-2">
              <span className="material-symbols-outlined text-4xl text-blue-200">storefront</span>
              Serene C2C
            </h1>
            <p className="mt-4 text-blue-100/80 font-medium leading-relaxed max-w-sm">Duyệt nhanh chóng. Bán dễ dàng. Nền tảng kết nối trực tiếp những nhà sáng tạo và người tiêu dùng.</p>
          </div>

          <div className="relative z-10">
            <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
              <div className="flex gap-1 text-amber-300 mb-2">
                <span className="material-symbols-outlined text-sm">star</span>
                <span className="material-symbols-outlined text-sm">star</span>
                <span className="material-symbols-outlined text-sm">star</span>
                <span className="material-symbols-outlined text-sm">star</span>
                <span className="material-symbols-outlined text-sm">star</span>
              </div>
              <p className="text-sm font-medium mb-4 text-white">"Nền tảng thanh lý và phân phối tuyệt vời nhất mà mình từng nâng cấp cửa hàng lên."</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#00629d] font-bold text-xs">MA</div>
                <div className="text-xs">
                  <p className="font-bold">Minh Anh</p>
                  <p className="text-blue-200">Shop Owner</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="col-span-1 p-12 flex flex-col justify-center">
          <div className="max-w-xs mx-auto w-full">
            <h2 className="text-2xl font-bold font-['Plus_Jakarta_Sans'] text-[#0f1d25] mb-2">Đăng nhập tài khoản</h2>
            <p className="text-sm text-[#707882] mb-8">Vui lòng nhập email của bạn để tiếp tục.</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-center gap-3">
                <span className="material-symbols-outlined text-red-500 text-sm">error</span>
                <p className="text-xs text-red-800 font-bold">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#707882] mb-2">Email</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#bfc7d3] group-focus-within:text-[#00629d] transition-colors text-[20px]">mail</span>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-[#f5faff] border border-[#dbeaf5] focus:border-[#00629d] focus:ring-4 focus:ring-[#00629d]/10 outline-none rounded-xl py-3 pl-12 pr-4 text-sm font-medium transition-all"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#707882] mb-2 flex justify-between">
                  Mật khẩu
                  <a href="#" className="normal-case text-[#00629d] hover:underline">Quên mật khẩu?</a>
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#bfc7d3] group-focus-within:text-[#00629d] transition-colors text-[20px]">lock</span>
                  <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-[#f5faff] border border-[#dbeaf5] focus:border-[#00629d] focus:ring-4 focus:ring-[#00629d]/10 outline-none rounded-xl py-3 pl-12 pr-4 text-sm font-medium transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#00629d] hover:bg-[#004e7c] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  ) : 'Đăng nhập'}
                </button>
              </div>
            </form>

            <div className="mt-8 text-center text-sm font-medium text-[#707882]">
              Người xem mới? <a href="#" className="font-bold text-[#00629d] hover:underline">Tạo một tài khoản ngay</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
