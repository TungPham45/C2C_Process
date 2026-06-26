import { FC, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ShopSales {
  shop_id: number;
  name: string;
  slug: string;
  logo_url: string;
  total_revenue: number;
  total_orders: number;
}

const ShopSalesAnalytics: FC = () => {
  const [data, setData] = useState<ShopSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'all' | 'week' | 'month'>('all');
  const [search, setSearch] = useState('');

  const fetchSales = async (tf: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/analytics/shop-sales?timeframe=${tf}`);
      if (!res.ok) throw new Error('Không thể tải dữ liệu phân tích doanh số');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(timeframe);
  }, [timeframe]);

  const filteredData = data.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.shop_id.toString() === search
  );

  // Lấy top 10 cho biểu đồ trực quan, bảng dưới sẽ show hết theo filteredData
  const chartData = filteredData.slice(0, 10);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(val)
      .replace('₫', 'đ');
  };

  return (
    <AdminLayout pageTitle="Doanh thu Gian Hàng">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
            <div>
               <h2 className="text-2xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans'] tracking-tight">Xếp hạng Doanh thu</h2>
               <p className="text-xs text-[#707882]">Thống kê hoạt động kinh doanh của tất cả gian hàng theo bộ lọc thời gian.</p>
            </div>
            
            <div className="flex bg-white rounded-full p-1 shadow-sm border border-[#e1f0fb]">
               <button 
                  onClick={() => setTimeframe('all')}
                  className={`px-6 py-2 text-xs font-bold rounded-full transition-colors ${timeframe === 'all' ? 'bg-[#e9f5ff] text-[#00629d]' : 'text-[#707882] hover:text-[#00629d]'}`}
               >Toàn bộ</button>
               <button 
                  onClick={() => setTimeframe('month')}
                  className={`px-6 py-2 text-xs font-bold rounded-full transition-colors ${timeframe === 'month' ? 'bg-[#e9f5ff] text-[#00629d]' : 'text-[#707882] hover:text-[#00629d]'}`}
               >30 ngày</button>
               <button 
                  onClick={() => setTimeframe('week')}
                  className={`px-6 py-2 text-xs font-bold rounded-full transition-colors ${timeframe === 'week' ? 'bg-[#e9f5ff] text-[#00629d]' : 'text-[#707882] hover:text-[#00629d]'}`}
               >7 ngày</button>
            </div>
        </div>

        {loading ? (
             <div className="h-[400px] flex flex-col items-center justify-center text-[#707882] bg-white rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb]">
                <div className="w-10 h-10 border-4 border-[#cfe5ff] border-t-[#00629d] rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-bold animate-pulse">Đang nạp dữ liệu thống kê...</p>
             </div>
        ) : error ? (
             <div className="h-[400px] flex flex-col items-center justify-center text-[#ba1a1a] bg-white rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb]">
                <span className="material-symbols-outlined text-4xl mb-2">error</span>
                <p className="font-bold">{error}</p>
             </div>
        ) : data.length === 0 ? (
             <div className="h-[400px] flex flex-col items-center justify-center text-[#707882] bg-white rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb]">
                <span className="material-symbols-outlined text-4xl mb-4 text-[#cfe5ff]">sentiment_dissatisfied</span>
                <p className="font-bold text-[#0f1d25]">Chưa có số liệu</p>
                <p className="text-xs">Không có dữ liệu kinh doanh nào trong khoảng thời gian này.</p>
             </div>
        ) : (
          <>
            {/* Chart Section */}
            <div className="bg-white rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb] p-10">
                <div className="flex gap-10 border-b border-[#f5faff] pb-6 mb-6">
                   <div>
                      <p className="text-[10px] uppercase font-bold text-[#707882] tracking-widest mb-1">Doanh thu Toàn bộ</p>
                      <h3 className="text-3xl font-bold text-[#00629d] font-['Plus_Jakarta_Sans']">
                         {formatCurrency(data.reduce((sum, item) => sum + item.total_revenue, 0))}
                      </h3>
                   </div>
                   <div>
                      <p className="text-[10px] uppercase font-bold text-[#707882] tracking-widest mb-1">Tổng đơn Thành công</p>
                      <h3 className="text-3xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">
                         {new Intl.NumberFormat('vi-VN').format(data.reduce((sum, item) => sum + item.total_orders, 0))}
                      </h3>
                   </div>
                </div>

                <div className="h-[300px] w-full pt-4">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1f0fb" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#707882', fontSize: 10, fontWeight: 500 }}
                          dy={10}
                          tickFormatter={(val: string) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#707882', fontSize: 10, fontWeight: 500 }}
                          tickFormatter={(val: number) => new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(val)}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f5faff' }}
                          contentStyle={{ 
                            borderRadius: '16px', 
                            border: 'none', 
                            boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                            padding: '16px 20px'
                          }}
                          formatter={(value: any) => [<span className="font-bold text-[#00629d] text-sm">{formatCurrency(value)}</span>, <span className="text-xs text-[#707882] uppercase tracking-widest font-bold">Doanh số</span>]}
                        />
                        <Bar 
                          dataKey="total_revenue" 
                          barSize={32}
                          radius={[6, 6, 0, 0]}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#00629d' : '#80b1ce'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                     <div className="h-full flex items-center justify-center text-[#707882] text-sm font-bold">Không khớp điều kiện tìm kiếm</div>
                  )}
                </div>
            </div>

            {/* List Section */}
            <div className="bg-white rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb] overflow-hidden">
                <div className="px-10 py-8 border-b border-[#f5faff] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-lg font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Bảng Xếp Hạng</h3>
                  
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#707882]">search</span>
                    <input 
                      type="text" 
                      placeholder="Tìm ID hoặc Tên Gian hàng..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-12 pr-4 py-2.5 bg-[#f5faff] border-none rounded-full text-sm font-medium focus:ring-2 focus:ring-[#00629d]/20 outline-none w-64"
                    />
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                    <thead>
                        <tr className="bg-[#f5faff] text-[#707882] text-[10px] font-bold uppercase tracking-widest">
                        <th className="px-10 py-5 w-20">Hạng</th>
                        <th className="px-6 py-5">Gian Hàng</th>
                        <th className="px-6 py-5 text-right">Lượt Bán</th>
                        <th className="px-10 py-5 text-right w-48">Tổng Doanh Thu</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f5faff]">
                        {filteredData.map((shop, index) => (
                        <tr key={shop.shop_id} className="hover:bg-[#f5faff]/50 transition-colors group">
                            <td className="px-10 py-6">
                               <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? 'bg-[#ffedd5] text-[#c2410c]' : index === 1 ? 'bg-[#f1f5f9] text-[#475569]' : index === 2 ? 'bg-[#fef3c7] text-[#b45309]' : 'bg-[#e9f5ff] text-[#00629d]'}`}>
                                  #{index + 1}
                               </div>
                            </td>
                            <td className="px-6 py-6">
                               <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-white border border-[#e1f0fb] overflow-hidden shrink-0 p-0.5">
                                    {shop.logo_url ? (
                                    <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                    <div className="w-full h-full bg-[#f5faff] rounded-lg border border-[#e1f0fb] flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[#707882] opacity-50">storefront</span>
                                    </div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-[#0f1d25] mb-1">{shop.name}</p>
                                    <p className="text-[10px] text-[#707882] font-medium tracking-tight">ID: {shop.shop_id}</p>
                                </div>
                                </div>
                            </td>
                            <td className="px-6 py-6 text-right">
                               <span className="text-sm font-bold text-[#475569] bg-[#f1f5f9] px-3 py-1 rounded-full">{shop.total_orders} đơn</span>
                            </td>
                            <td className="px-10 py-6 text-right">
                               <span className="text-sm font-bold text-[#00629d] tracking-tight">{formatCurrency(shop.total_revenue)}</span>
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default ShopSalesAnalytics;
