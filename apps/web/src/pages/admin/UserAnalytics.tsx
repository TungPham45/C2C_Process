import { FC, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface GrowthData {
  date: string;
  newUsers: number;
}

const UserAnalytics: FC = () => {
  const [data, setData] = useState<GrowthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'all' | 'week' | 'month'>('all');

  const fetchGrowth = async (tf: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/analytics/user-growth?timeframe=${tf}`);
      if (!res.ok) throw new Error('Không thể tải dữ liệu phân tích');
      const json = await res.json();
      
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrowth(timeframe);
  }, [timeframe]);

  return (
    <AdminLayout pageTitle="Phân tích Người dùng">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between">
            <div>
               <h2 className="text-2xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans'] tracking-tight">Tăng trưởng Người dùng</h2>
               <p className="text-xs text-[#707882]">Thống kê lượng tài khoản mới đăng ký theo thời gian thực.</p>
            </div>
            
            <div className="flex bg-white rounded-full p-1 shadow-sm border border-[#e1f0fb]">
               <button 
                  onClick={() => setTimeframe('all')}
                  className={`px-6 py-2 text-xs font-bold rounded-full transition-colors ${timeframe === 'all' ? 'bg-[#e9f5ff] text-[#00629d]' : 'text-[#707882] hover:text-[#00629d]'}`}
               >Toàn thời gian</button>
               <button 
                  onClick={() => setTimeframe('month')}
                  className={`px-6 py-2 text-xs font-bold rounded-full transition-colors ${timeframe === 'month' ? 'bg-[#e9f5ff] text-[#00629d]' : 'text-[#707882] hover:text-[#00629d]'}`}
               >Tháng này</button>
               <button 
                  onClick={() => setTimeframe('week')}
                  className={`px-6 py-2 text-xs font-bold rounded-full transition-colors ${timeframe === 'week' ? 'bg-[#e9f5ff] text-[#00629d]' : 'text-[#707882] hover:text-[#00629d]'}`}
               >Tuần này</button>
            </div>
        </div>

        {/* Chart Section */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-[#e1f0fb] p-10">
           {loading ? (
             <div className="h-[400px] flex flex-col items-center justify-center text-[#707882]">
                <div className="w-10 h-10 border-4 border-[#cfe5ff] border-t-[#00629d] rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-bold animate-pulse">Đang nạp dữ liệu thống kê...</p>
             </div>
           ) : error ? (
             <div className="h-[400px] flex flex-col items-center justify-center text-[#ba1a1a]">
                <span className="material-symbols-outlined text-4xl mb-2">error</span>
                <p className="font-bold">{error}</p>
             </div>
           ) : data.length === 0 ? (
             <div className="h-[400px] flex flex-col items-center justify-center text-[#707882]">
                <span className="material-symbols-outlined text-4xl mb-4 text-[#cfe5ff]">monitoring</span>
                <p className="font-bold text-[#0f1d25]">Chưa có dữ liệu</p>
                <p className="text-xs">Hiện tại chưa có người dùng nào đăng ký trên hệ thống.</p>
             </div>
           ) : (
             <div className="space-y-6">
                <div className="flex gap-10 border-b border-[#f5faff] pb-6">
                   <div>
                      <p className="text-[10px] uppercase font-bold text-[#707882] tracking-widest mb-1">Tổng người dùng mới</p>
                      <h3 className="text-3xl font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">
                         {data.reduce((sum, item) => sum + item.newUsers, 0)}
                      </h3>
                   </div>
                </div>

                <div className="h-[400px] w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00629d" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#00629d" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1f0fb" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#707882', fontSize: 12, fontWeight: 500 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#707882', fontSize: 12, fontWeight: 500 }}
                        dx={-10}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '16px', 
                          border: 'none', 
                          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                          padding: '16px 20px',
                          fontWeight: 'bold'
                        }}
                        formatter={(value: any) => [`${value} tài khoản`, 'Mới đăng ký']}
                        labelStyle={{ color: '#707882', marginBottom: '8px', fontSize: '12px' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="newUsers" 
                        stroke="#00629d" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorUsers)" 
                        activeDot={{ r: 8, strokeWidth: 0, fill: '#00629d' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
             </div>
           )}
        </div>

      </div>
    </AdminLayout>
  );
};

export default UserAnalytics;
