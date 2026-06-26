import { FC, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AUTH_API_URL, PRODUCT_API_URL } from '../../config/api';

type AuthState = 'login' | 'register' | 'forgot-password' | 'verify-otp' | 'reset-password';

export const AuthPage: FC = () => {
  const [state, setState] = useState<AuthState>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpPurpose, setOtpPurpose] = useState<'REGISTER' | 'RESET_PASSWORD'>('REGISTER');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Handle auto-focus for OTP inputs
  useEffect(() => {
    if (state === 'verify-otp') {
      const firstInput = document.getElementById('otp-0');
      if (firstInput) firstInput.focus();
    }
  }, [state]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (state === 'login') {


        const res = await fetch(`${AUTH_API_URL}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Đăng nhập thất bại');

        localStorage.setItem('c2c_token', data.access_token);
        // ... (Seller context fetching logic same as before) ...
        const sellerRes = await fetch(`${PRODUCT_API_URL}/seller/context`, {
          headers: { 'Authorization': `Bearer ${data.access_token}` }
        });
        const sellerContext = sellerRes.ok ? await sellerRes.json() : null;
        const sessionUser = { ...data.user, shop: sellerContext?.shop || null };
        localStorage.setItem('c2c_user', JSON.stringify(sessionUser));

        const redirectUrl = location.state?.from;
        if (redirectUrl) navigate(redirectUrl);
        else if (sellerContext?.shop) navigate('/');
        else if (sessionUser.role === 'admin') navigate('/admin');
        else navigate('/');
      }

      else if (state === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu nhập lại không khớp');
        }

        const nameRegex = /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠỨỪỮỮỰẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăâêôơứừữữựấầẩẫậắằẳẵặẹẻẽềềể\s]+$/;
        if (!nameRegex.test(fullName)) {
          throw new Error('Họ và tên người nhận chỉ được chứa chữ cái.');
        }

        const phoneRegex = /^0\d{9}$/;
        if (!phoneRegex.test(phone)) {
          throw new Error('Số điện thoại phải có đúng 10 chữ số và bắt đầu bằng số 0.');
        }

        const res = await fetch(`${AUTH_API_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name: fullName, phone })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Đăng ký thất bại');

        setOtpPurpose('REGISTER');
        setState('verify-otp');
        setSuccess('Mã OTP đã được gửi đến email của bạn để xác thực tài khoản.');
      }

      else if (state === 'forgot-password') {
        const res = await fetch(`${AUTH_API_URL}/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Yêu cầu gửi OTP thất bại');

        setOtpPurpose('RESET_PASSWORD');
        setState('verify-otp');
        setSuccess('Mã OTP đã được gửi đến email của bạn để khôi phục mật khẩu.');
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${AUTH_API_URL}/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, purpose: otpPurpose })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gửi lại OTP thất bại');

      setSuccess('Mã OTP mới đã được gửi vào email của bạn.');
    } catch (err: any) {
      setError(err.message || 'Gửi lại OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const code = otp.join('');

    try {
      const res = await fetch(`${AUTH_API_URL}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, purpose: otpPurpose })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Mã OTP không hợp lệ');

      if (otpPurpose === 'REGISTER') {
        setSuccess('Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay.');
        setState('login');
      } else {
        setState('reset-password');
      }
    } catch (err: any) {
      setError(err.message || 'Xác thực OTP thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const code = otp.join('');

    try {
      const res = await fetch(`${AUTH_API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Đặt lại mật khẩu thất bại');

      setSuccess('Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.');
      setState('login');
    } catch (err: any) {
      setError(err.message || 'Đặt lại mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5faff] font-['Inter'] relative overflow-hidden p-6">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-2/3 h-full bg-gradient-to-br from-blue-100/40 to-white transform -skew-x-12 translate-x-32 z-0"></div>
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[#00629d] rounded-full mix-blend-multiply filter blur-3xl opacity-10 z-0"></div>
      <div className="absolute top-32 right-32 w-72 h-72 bg-[#42a5f5] rounded-full mix-blend-multiply filter blur-3xl opacity-10 z-0"></div>

      <div className="w-full max-w-[1000px] grid grid-cols-1 md:grid-cols-2 bg-white rounded-[3rem] shadow-2xl relative z-10 overflow-hidden min-h-[700px] border border-blue-50">
        {/* Left Side: Brand Panel */}
        <div className="hidden md:flex bg-gradient-to-br from-[#004e7c] to-[#00629d] p-16 text-white flex-col justify-between relative">
          <div className="absolute inset-0 bg-[#000]/10 mix-blend-overlay"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-3xl font-bold">eco</span>
              </div>
              <h1 className="text-3xl font-black font-['Plus_Jakarta_Sans'] tracking-tight">Serene</h1>
            </div>
            <h2 className="text-5xl font-black font-['Plus_Jakarta_Sans'] leading-tight">
              Chào mừng đến với <br />
              <span className="text-[#99cbff]">Digital Sanctuary</span>
            </h2>
            <p className="mt-8 text-blue-100/60 text-lg leading-relaxed max-w-sm">
              Nền tảng thương mại C2C tuyệt đẹp dành cho những người đam mê mua sắm và sáng tạo.
            </p>
          </div>
          <div className="relative z-10">
            <div className="p-8 bg-white/10 backdrop-blur-2xl rounded-[2.5rem] border border-white/20">
              <p className="text-white font-medium italic text-lg mb-6">"Trải nghiệm khám phá các món đồ chưa bao giờ yên bình và cao cấp đến thế."</p>
              <div className="flex items-center gap-4">
                <img src="https://i.pravatar.cc/100?img=32" className="w-12 h-12 rounded-2xl border-2 border-white/20" alt="" />
                <div>
                  <p className="font-bold">Julia Roberts</p>
                  <p className="text-xs text-blue-200 uppercase tracking-widest font-black">Nhà Sáng Tạo Nổi Bật</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Forms */}
        <div className="p-12 md:p-16 flex flex-col justify-center">
          <div className="max-w-sm mx-auto w-full space-y-8">
            <div>
              <h2 className="text-3xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">
                {state === 'login' && 'Đăng Nhập'}
                {state === 'register' && 'Tạo Tài Khoản'}
                {state === 'forgot-password' && 'Khôi Phục Mật Khẩu'}
                {state === 'verify-otp' && 'Xác Thực Email'}
                {state === 'reset-password' && 'Mật Khẩu Mới'}
              </h2>
              <p className="text-sm text-[#707882] mt-2 font-medium">
                {state === 'login' && 'Nhập thông tin của bạn để tiếp tục.'}
                {state === 'register' && 'Tham gia cộng đồng những nhà sáng tạo độc đáo.'}
                {state === 'forgot-password' && 'Nhập email để nhận mã xác thực an toàn.'}
                {state === 'verify-otp' && `Chúng tôi đã gửi mã 6 số tới email của bạn.`}
                {state === 'reset-password' && 'Chọn một mật khẩu mới thật mạnh.'}
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-[#ba1a1a] text-xs font-bold rounded-2xl border border-red-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <span className="material-symbols-outlined text-sm">error</span>
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 text-[#1b6b3e] text-xs font-bold rounded-2xl border border-green-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                {success}
              </div>
            )}

            {/* FORM: Login/Register/Forgot */}
            {(state === 'login' || state === 'register' || state === 'forgot-password') && (
              <form onSubmit={handleAuth} className="space-y-6">
                {state === 'register' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-[#454e58] mb-2 ml-1">Họ và Tên</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[#bfc7d3] group-focus-within:text-[#00629d] transition-colors">person</span>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value.replace(/[^a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂÂÊÔƠỨỪỮỮỰẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăâêôơứừữữựấầẩẫậắằẳẵặẹẻẽềềể\s]/g, ''))}
                          required
                          placeholder="Nguyễn Văn A"
                          className="w-full h-14 pl-14 pr-5 bg-[#f5faff] border border-[#dbeaf5] rounded-[1.25rem] text-sm font-medium focus:bg-white focus:border-[#00629d] focus:ring-4 focus:ring-[#00629d]/5 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#454e58] mb-2 ml-1">Số Điện Thoại</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[#bfc7d3] group-focus-within:text-[#00629d] transition-colors">call</span>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                          required
                          placeholder="0123456789"
                          className="w-full h-14 pl-14 pr-5 bg-[#f5faff] border border-[#dbeaf5] rounded-[1.25rem] text-sm font-medium focus:bg-white focus:border-[#00629d] focus:ring-4 focus:ring-[#00629d]/5 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-bold text-[#454e58] mb-2 ml-1">Địa chỉ Email</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[#bfc7d3] group-focus-within:text-[#00629d] transition-colors">mail</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="name@example.com"
                      className="w-full h-14 pl-14 pr-5 bg-[#f5faff] border border-[#dbeaf5] rounded-[1.25rem] text-sm font-medium focus:bg-white focus:border-[#00629d] focus:ring-4 focus:ring-[#00629d]/5 outline-none transition-all"
                    />
                  </div>
                </div>

                {state !== 'forgot-password' && (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-[#454e58] mb-2 ml-1 flex justify-between">
                        Mật Khẩu
                        {state === 'login' && (
                          <button type="button" onClick={() => setState('forgot-password')} className="normal-case text-[#00629d] hover:underline font-bold">Quên mật khẩu?</button>
                        )}
                      </label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[#bfc7d3] group-focus-within:text-[#00629d] transition-colors">lock</span>
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          className="w-full h-14 pl-14 pr-12 bg-[#f5faff] border border-[#dbeaf5] rounded-[1.25rem] text-sm font-medium focus:bg-white focus:border-[#00629d] focus:ring-4 focus:ring-[#00629d]/5 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-[#bfc7d3] hover:text-[#00629d] transition-colors flex items-center justify-center p-1"
                          tabIndex={-1}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {showPassword ? "visibility_off" : "visibility"}
                          </span>
                        </button>
                      </div>
                    </div>
                    {state === 'register' && (
                      <div>
                        <label className="block text-sm font-bold text-[#454e58] mb-2 ml-1">Xác nhận Mật khẩu</label>
                        <div className="relative group">
                          <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[#bfc7d3] group-focus-within:text-[#00629d] transition-colors">lock</span>
                          <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                            className="w-full h-14 pl-14 pr-12 bg-[#f5faff] border border-[#dbeaf5] rounded-[1.25rem] text-sm font-medium focus:bg-white focus:border-[#00629d] focus:ring-4 focus:ring-[#00629d]/5 outline-none transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-[#0f1d25] text-white font-black text-xs uppercase tracking-[0.2em] rounded-[1.25rem] shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                  {state === 'login' ? 'Đăng Nhập' : state === 'register' ? 'Đăng Ký' : 'Gửi Mã OTP'}
                </button>
              </form>
            )}

            {/* FORM: OTP Verification */}
            {state === 'verify-otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-10">
                <div className="flex justify-between gap-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-12 h-16 bg-[#f5faff] border border-[#dbeaf5] rounded-2xl text-center text-xl font-black focus:bg-white focus:border-[#00629d] focus:ring-4 focus:ring-[#00629d]/5 outline-none transition-all"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.some(d => !d)}
                  className="w-full h-14 bg-[#00629d] text-white font-black text-xs uppercase tracking-[0.2em] rounded-[1.25rem] shadow-xl shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                  Xác Thực Tài Khoản
                </button>

                <div className="text-center">
                  <p className="text-sm text-[#707882] font-medium">Chưa nhận được mã?</p>
                  <button type="button" onClick={handleResendOtp} disabled={loading} className="text-[#00629d] font-bold text-sm mt-2 hover:underline disabled:opacity-50">Gửi lại OTP</button>
                </div>
              </form>
            )}

            {/* FORM: Reset Password */}
            {state === 'reset-password' && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-[#454e58] mb-2 ml-1">Mật Khẩu Mới</label>
                  <div className="relative group">
                    <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-[#bfc7d3] group-focus-within:text-[#00629d] transition-colors">lock</span>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full h-14 pl-14 pr-12 bg-[#f5faff] border border-[#dbeaf5] rounded-[1.25rem] text-sm font-medium focus:bg-white focus:border-[#00629d] focus:ring-4 focus:ring-[#00629d]/5 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-[#bfc7d3] hover:text-[#00629d] transition-colors flex items-center justify-center p-1"
                      tabIndex={-1}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-[#0f1d25] text-white font-black text-xs uppercase tracking-[0.2em] rounded-[1.25rem] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                  Lưu Mật Khẩu
                </button>
              </form>
            )}

            <div className="pt-8 border-t border-[#f5faff] text-center">
              {state === 'login' ? (
                <p className="text-sm font-medium text-[#707882]">
                  Chưa có tài khoản? <button onClick={() => setState('register')} className="text-[#00629d] font-black hover:underline">Đăng Ký Ngay</button>
                </p>
              ) : (
                <button onClick={() => setState('login')} className="text-sm font-black text-[#00629d] hover:underline flex items-center justify-center gap-2 mx-auto">
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Quay lại Đăng Nhập
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
