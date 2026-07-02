import { FC, useState, useEffect } from 'react';
import { MarketplaceLayout } from '../../components/layout/MarketplaceLayout';
import { useNavigate, Link } from 'react-router-dom';
import { PRODUCT_API_URL } from '../../config/api';

export const SellerRegistration: FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [shopStatus, setShopStatus] = useState<string | null>(null);

  // check trạng thái hiện tại của shop
  useEffect(() => {
    const checkStatus = async () => {
      const token = localStorage.getItem('c2c_token');
      if (!token) return;
      try {
        const res = await fetch(`${PRODUCT_API_URL}/seller/context`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.shop) {
            setAlreadyRegistered(true);
            setShopStatus(data.shop.status);
            if (data.shop.status === 'active') {
              navigate('/seller/center');
            }
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    checkStatus();
  }, [navigate]);

  // xử lý đăng ký
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('c2c_token');
      if (!token) throw new Error('Vui lòng đăng nhập lại');

      const res = await fetch(`${PRODUCT_API_URL}/seller/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Đăng ký thất bại');
      }

      // Update local storage so Header knows we have a shop soon
      const userStr = localStorage.getItem('c2c_user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          user.shop = { status: 'pending' };
          localStorage.setItem('c2c_user', JSON.stringify(user));
        } catch (err) {}
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MarketplaceLayout>
      <div className="max-w-3xl mx-auto px-6 py-20">
        <div className="bg-white rounded-[3rem] p-12 shadow-xl shadow-blue-500/10 border border-[#dbeaf5]">
          {success || (alreadyRegistered && shopStatus === 'pending') ? (
            // màn hình đang chờ duyệt
            <div className="text-center py-10 animate-in fade-in zoom-in duration-500">
              <div className="w-24 h-24 bg-amber-50 text-amber-500 rounded-full mx-auto flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-5xl">
                  hourglass_empty
                </span>
              </div>
              <h2 className="text-3xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mb-4">
                Hồ sơ đang chờ duyệt
              </h2>
              <p className="text-[#707882] text-base mb-8 max-w-lg mx-auto leading-relaxed">
                Cảm ơn bạn đã đăng ký trở thành Nhà Bán Hàng trên Serene. Hồ sơ
                cửa hàng của bạn hiện đang được Ban quản trị kiểm duyệt. Vui
                lòng quay lại sau!
              </p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#f5faff] text-[#00629d] font-bold rounded-2xl hover:bg-[#e9f5ff] transition-colors"
              >
                <span className="material-symbols-outlined">home</span>
                Quay về Trang chủ
              </Link>
            </div>
          ) : (
            // form đăng ký
            <>
              <div className="text-center mb-10">
                <div className="w-20 h-20 bg-gradient-to-br from-[#00629d] to-[#42a5f5] rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
                  <span className="material-symbols-outlined text-white text-4xl">
                    store
                  </span>
                </div>
                <h1 className="text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25] mb-4">
                  Trở thành Người bán
                </h1>
                <p className="text-[#707882] text-lg">
                  Khởi tạo cửa hàng của bạn trên Serene Marketplace ngay hôm
                  nay.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-100 text-[#ba1a1a] rounded-2xl font-bold flex items-center gap-3">
                  <span className="material-symbols-outlined">error</span>{' '}
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">
                    Tên cửa hàng
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nhập tên cửa hàng của bạn"
                    className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all font-bold text-[#0f1d25]"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-widest text-[#707882] ml-1">
                    Mô tả ngắn
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Cửa hàng của bạn bán sản phẩm gì?"
                    className="w-full p-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all resize-none text-[#0f1d25]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-8 h-16 bg-[#00629d] text-white rounded-2xl font-black text-lg transition-all hover:bg-[#004e7c] active:scale-[0.98] shadow-xl shadow-blue-900/20 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {loading && (
                    <span className="material-symbols-outlined animate-spin">
                      progress_activity
                    </span>
                  )}
                  {loading ? 'Đang gửi hồ sơ...' : 'Đăng ký mở Cửa hàng ngay'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};
