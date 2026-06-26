import { FC, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { VoucherCard } from '../vouchers/VoucherCard';

export const VoucherSection: FC = () => {
    const navigate = useNavigate();
    const [vouchers, setVouchers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVouchers = async () => {
            try {
                const userStr = localStorage.getItem('c2c_user');
                if (!userStr) {
                    setLoading(false);
                    return;
                }
                const user = JSON.parse(userStr);
                
                const response = await fetch('/api/vouchers/available?only_active=true', {
                    headers: {
                        'x-user-id': user.id.toString()
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setVouchers(data.slice(0, 6));
                }
            } catch (err) {
                console.error('Failed to fetch vouchers', err);
            } finally {
                setLoading(false);
            }
        };

        fetchVouchers();
    }, []);

    const handleClaim = async (id: number) => {
        try {
            const userStr = localStorage.getItem('c2c_user');
            if (!userStr) {
                alert('Vui lòng đăng nhập để lưu voucher!');
                navigate('/auth', { state: { from: '/' } });
                return;
            }
            const user = JSON.parse(userStr);

            const response = await fetch(`/api/vouchers/${id}/claim`, {
                method: 'POST',
                headers: {
                    'x-user-id': user.id.toString()
                }
            });

            if (response.ok) {
                // Update local state to show as claimed
                setVouchers(prev => prev.map(v => v.id === id ? { ...v, isClaimed: true } : v));
            } else {
                const err = await response.json();
                alert(err.message || 'Failed to claim voucher');
            }
        } catch (err) {
            console.error('Claim error', err);
        }
    };

    const handleUse = (voucher: any) => {
        if (voucher.shop_id) {
            navigate(`/shop/${voucher.shop_id}`);
        } else {
            navigate('/products');
        }
    };

    if (loading) return null;
    if (vouchers.length === 0) return null;

    return (
        <section className="px-6 mb-16">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#00629d] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#00629d]/20">
                            <span className="material-symbols-outlined font-bold">confirmation_number</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Voucher Độc Quyền Cho Bạn</h2>
                            <p className="text-xs text-[#707882] font-semibold uppercase tracking-widest">Phần thưởng được chọn lọc</p>
                        </div>
                    </div>
                    <Link 
                        to="/vouchers" 
                        className="flex items-center gap-2 text-sm font-bold text-[#00629d] hover:underline"
                    >
                        Xem Tất Cả Voucher
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </Link>
                </div>

                <div className="flex gap-6 overflow-x-auto pb-8 snap-x no-scrollbar">
                    {vouchers.map(voucher => (
                        <div key={voucher.id} className="snap-start shrink-0 w-[320px]">
                            <VoucherCard 
                                voucher={voucher} 
                                onClaim={handleClaim}
                                onUse={handleUse}
                                isClaimed={voucher.isClaimed}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
