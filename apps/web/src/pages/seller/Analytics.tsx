import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { PRODUCT_API_URL } from '../../config/api';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md border border-[#bfc7d3]/30 p-4 rounded-2xl shadow-xl">
        <p className="font-bold text-[#0f1d25] mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-sm font-medium text-[#404751]">{entry.name}:</span>
            <span className="text-sm font-bold text-[#00629d]">
              {entry.name === 'Doanh thu' 
                ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(entry.value)
                : new Intl.NumberFormat('vi-VN').format(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const AnalyticsPage: FC = () => {
  const [stats, setStats] = useState({
    totalViews: 0,
    totalOrders: 0,
    totalRevenue: 0,
    conversionRate: '0',
    topProductsData: [{ name: 'Chưa có phân loại', sales: 0 }],
    trendData: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(30);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('c2c_token');
        const res = await fetch(`${PRODUCT_API_URL}/seller/analytics?days=${selectedDays}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error('Failed to fetch analytics', e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedDays]);

  const dayOptions = [
    { label: '10 Ngày', value: 10 },
    { label: '30 Ngày', value: 30 },
    { label: '90 Ngày', value: 90 },
  ];

  return (
    <SellerLayout pageTitle="Phân tích bán hàng">
      <div className="pb-12 max-w-7xl mx-auto space-y-8 animate-[fadeIn_0.5s_ease-out]">
        
        {/* Header Section */}
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-extrabold font-['Plus_Jakarta_Sans'] tracking-tight text-[#0f1d25]">Phân Tích Cửa Hàng</h2>
            <p className="text-[#404751] mt-1 text-sm">Hiệu suất và tăng trưởng dựa trên dữ liệu thời gian thực</p>
          </div>
          <div className="flex bg-white rounded-full p-1 shadow-sm border border-[#bfc7d3]/20">
            {dayOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSelectedDays(opt.value)}
                className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${selectedDays === opt.value ? 'text-white bg-[#00629d] shadow-md' : 'text-[#707882] hover:text-[#00629d]'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        {loading ? (
          <div className="text-center p-8 text-[#00629d] font-bold animate-pulse">Đang nạp dữ liệu thống kê...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'Tổng doanh thu', value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.totalRevenue), trend: '', isUp: true, icon: 'account_balance_wallet', color: 'from-blue-500 to-cyan-400' },
              { title: 'Lượt xem trang', value: new Intl.NumberFormat('vi-VN').format(stats.totalViews), trend: '', isUp: true, icon: 'visibility', color: 'from-purple-500 to-pink-400' },
              { title: 'Tổng sản phẩm đã bán', value: new Intl.NumberFormat('vi-VN').format(stats.totalOrders), trend: '', isUp: true, icon: 'shopping_bag', color: 'from-amber-400 to-orange-500' },
              { title: 'Tỷ lệ chuyển đổi', value: `${stats.conversionRate}%`, trend: '', isUp: true, icon: 'trending_up', color: 'from-emerald-400 to-teal-500' }
            ].map((card, idx) => (
              <div key={idx} className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/40 p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-transform duration-300 group">
                <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${card.color} opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500`} />
                <div className="flex justify-between items-start relative z-10">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} bg-opacity-10 flex items-center justify-center text-white shadow-lg`}>
                    <span className="material-symbols-outlined text-2xl">{card.icon}</span>
                  </div>
                </div>
                <div className="mt-6 relative z-10">
                  <p className="text-[#707882] font-medium text-sm">{card.title}</p>
                  <h3 className="text-2xl font-extrabold text-[#0f1d25] mt-1 font-['Plus_Jakarta_Sans']">{card.value}</h3>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Charts Section */}
        {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Area Chart */}
          <div className="lg:col-span-2 bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] justify-between flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-extrabold text-[#0f1d25]">Lưu lượng & Doanh thu</h3>
                <p className="text-[#707882] text-sm mt-1">Xu hướng 10 ngày gần nhất (ước lượng)</p>
              </div>
            </div>
            
            <div className="h-[350px] w-full mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00629d" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#00629d" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e7ef" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#707882', fontSize: 12}} dy={10} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{fill: '#707882', fontSize: 12}} dx={-10} tickFormatter={(val) => new Intl.NumberFormat('vi-VN', { notation: "compact" , compactDisplay: "short" }).format(val)} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{fill: '#707882', fontSize: 12}} dx={10} tickFormatter={(val) => new Intl.NumberFormat('vi-VN', { notation: "compact" , compactDisplay: "short" }).format(val)} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#00629d', strokeWidth: 1, strokeDasharray: '5 5' }} />
                  <Area yAxisId="left" type="monotone" name="Doanh thu" dataKey="revenue" stroke="#00629d" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Area yAxisId="right" type="monotone" name="Lượt xem" dataKey="views" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Bar Chart */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow">
            <h3 className="text-xl font-extrabold text-[#0f1d25] mb-1">Top Sản Phẩm</h3>
            <p className="text-[#707882] text-sm mb-6">{stats.totalOrders > 0 ? 'Xếp hạng bán chạy nhất' : 'Thu hút tương tác nhiều nhất'}</p>
            
            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topProductsData} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e1e7ef" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#404751', fontSize: 12, fontWeight: 600}} width={90} />
                  <Tooltip cursor={{fill: '#f5faff'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="sales" name={stats.totalOrders > 0 ? "Đã bán" : "Lượt tương tác"} fill="#42a5f5" radius={[0, 8, 8, 0]} barSize={24}>
                    {stats.topProductsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#00629d' : '#82ca9d'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <button
              onClick={() => navigate('/seller/products')}
              className="mt-8 w-full py-3 rounded-xl text-[#00629d] font-bold text-sm bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              Xem toàn bộ danh sách
            </button>
          </div>

        </div>
        )}
      </div>
    </SellerLayout>
  );
};;
