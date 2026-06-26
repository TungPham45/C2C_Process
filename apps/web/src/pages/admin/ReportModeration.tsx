import { FC, useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xử lý', color: 'bg-yellow-100 text-yellow-700' },
  under_review: { label: 'Đang xem xét', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: 'Đã giải quyết', color: 'bg-green-100 text-green-700' },
  closed: { label: 'Đã đóng', color: 'bg-gray-100 text-gray-600' },
};

const ACTION_LABELS: Record<string, string> = {
  lock_product: '🔒 Khóa sản phẩm',
  restore_product: '🔓 Khôi phục sản phẩm',
  suspend_shop: '🚫 Đình chỉ cửa hàng',
  activate_shop: '✅ Kích hoạt lại cửa hàng',
  suspend_reported_user: '⛔ Khóa người bị tố cáo',
  activate_user: '👤 Kích hoạt lại người bị tố cáo',
  suspend_reporter: '☣️ Khóa người tố cáo (Tố cáo giả)',
  activate_reporter: '🤝 Mở khóa người tố cáo',
  none: 'Không thực hiện hành động phụ',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  product: 'Sản phẩm',
  shop: 'Cửa hàng',
  order: 'Đơn hàng',
};

interface Report {
  id: number;
  reporter_id: number;
  reporter_name?: string;
  target_type: string;
  product_id?: number | null;
  product_name?: string | null;
  shop_id?: number | null;
  shop_name?: string | null;
  shop_order_id?: number | null;
  report_reason: { name: string };
  description: string;
  status: string;
  severity: string;
  evidence_urls?: string[] | null;
  created_at: string;
  admin_note?: string | null;
  resolution?: string | null;
  resolution_action?: string | null;
  reporter?: {
    status?: string;
  } | null;
}

export const ReportModeration: FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isReEvaluating, setIsReEvaluating] = useState(false);
  
  const [actionNote, setActionNote] = useState('');
  const [actionResolution, setActionResolution] = useState('');
  const [selectedAction, setSelectedAction] = useState('none');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReports = async (status = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('c2c_token');
      const url = status ? `/api/reports/admin?status=${status}` : '/api/reports/admin';
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data || []);
      }
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(filterStatus);
  }, [filterStatus]);

  const handleUpdateStatus = async (reportId: number, newStatus: string) => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('c2c_token');
      const res = await fetch(`/api/reports/admin/${reportId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: newStatus,
          admin_note: actionNote,
          resolution: actionResolution,
          action: selectedAction,
        }),
      });
      if (res.ok) {
        setSelectedReport(null);
        setIsReEvaluating(false);
        setActionNote('');
        setActionResolution('');
        setSelectedAction('none');
        fetchReports(filterStatus);
      }
    } catch (err) {
      console.error('Failed to update status', err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getTargetId = (report: Report) => {
    if (report.target_type === 'product') return report.product_id;
    if (report.target_type === 'shop') return report.shop_id;
    return report.shop_order_id;
  };

  const isResolved = selectedReport && (selectedReport.status === 'resolved' || selectedReport.status === 'closed');

  return (
    <AdminLayout pageTitle="Quản lý Tố Cáo">
      <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Quản lý Tố Cáo</h1>
          <p className="text-sm text-gray-500 mt-1">Đảm bảo môi trường kinh doanh minh bạch và an toàn</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tình trạng</span>
                <span className="font-bold text-red-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    {reports.filter(r => r.status === 'pending').length} Đơn mới
                </span>
            </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {[
          { value: '', label: 'Tất cả' },
          { value: 'pending', label: 'Chờ xử lý' },
          { value: 'under_review', label: 'Đang xem xét' },
          { value: 'resolved', label: 'Đã giải quyết' },
          { value: 'closed', label: 'Đã đóng' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
              filterStatus === tab.value
                ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-32 bg-white rounded-3xl border border-gray-100">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Đang tải dữ liệu...</p>
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-32">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-gray-300">inbox</span>
          </div>
          <p className="text-gray-400 font-bold">Không tìm thấy đơn tố cáo nào</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="text-left px-6 py-5 font-black text-gray-400 uppercase tracking-tighter text-[10px]">Mã đơn</th>
                <th className="text-left px-6 py-5 font-black text-gray-400 uppercase tracking-tighter text-[10px]">Đối tượng bị tố cáo</th>
                <th className="text-left px-6 py-5 font-black text-gray-400 uppercase tracking-tighter text-[10px]">Lý do & Nội dung</th>
                <th className="text-left px-6 py-5 font-black text-gray-400 uppercase tracking-tighter text-[10px]">Người tố cáo</th>
                <th className="text-left px-6 py-5 font-black text-gray-400 uppercase tracking-tighter text-[10px]">Trạng thái</th>
                <th className="text-left px-6 py-5 font-black text-gray-400 uppercase tracking-tighter text-[10px]">Ngày gửi</th>
                <th className="text-right px-6 py-5 font-black text-gray-400 uppercase tracking-tighter text-[10px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {reports.map((report) => {
                const statusInfo = STATUS_LABELS[report.status] || STATUS_LABELS.pending;
                return (
                  <tr key={report.id} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="px-6 py-5">
                        <span className="font-black text-gray-400 text-xs">#{report.id}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-sm">
                            {report.target_type === 'product' ? (report.product_name || `SP #${report.product_id}`) : 
                             report.target_type === 'shop' ? (report.shop_name || `Shop #${report.shop_id}`) : 
                             `Đơn hàng #${report.shop_order_id}`}
                        </span>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-0.5">
                            {TARGET_TYPE_LABELS[report.target_type]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-[250px]">
                      <p className="font-bold text-gray-800 line-clamp-1">{report.report_reason?.name}</p>
                      <p className="text-xs text-gray-400 line-clamp-1 mt-0.5 italic">"{report.description}"</p>
                    </td>
                    <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center">
                                <span className="material-symbols-outlined text-sm text-gray-400">person</span>
                            </div>
                            <span className="font-bold text-gray-600 text-xs">{report.reporter_name || `ID #${report.reporter_id}`}</span>
                        </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-gray-400 text-[11px] font-medium">{formatDate(report.created_at)}</td>
                    <td className="px-6 py-5 text-right">
                      <button
                        onClick={() => { 
                          setSelectedReport(report); 
                          setActionNote(report.admin_note || ''); 
                          setActionResolution(report.resolution || '');
                          setSelectedAction('none');
                          setIsReEvaluating(false);
                        }}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-900 rounded-xl text-xs font-black hover:border-gray-900 hover:shadow-lg hover:shadow-gray-100 transition-all active:scale-95 flex items-center gap-2 ml-auto"
                      >
                        {isResolved ? 'Xem chi tiết' : 'Xử lý ngay'}
                        <span className="material-symbols-outlined text-sm">{isResolved ? 'visibility' : 'gavel'}</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Professional Detail / Action Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[250] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col scale-in-center">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-8 border-b border-gray-50 bg-gray-50/50">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${selectedReport.status === 'pending' ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                    <span className="material-symbols-outlined text-2xl font-bold">{isResolved ? 'verified_user' : 'priority_high'}</span>
                </div>
                <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Chi tiết Tố cáo #{selectedReport.id}</h2>
                    <p className="text-xs font-bold text-gray-400 tracking-widest uppercase mt-0.5">Thời gian nhận: {formatDate(selectedReport.created_at)}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedReport(null)} 
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
                title="Đóng"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              
              {/* Information Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Thông tin đối tượng</h3>
                    <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">Hình thức:</span>
                            <span className="font-black text-blue-600 uppercase text-[10px] tracking-widest">{TARGET_TYPE_LABELS[selectedReport.target_type]}</span>
                        </div>
                        <div className="flex justify-between items-start text-sm">
                            <span className="text-gray-400">Tên thực:</span>
                            <span className="font-bold text-gray-900 text-right">
                                {selectedReport.product_name || selectedReport.shop_name || "N/A"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-50">
                             <span className="text-gray-400">Mã ID:</span>
                             <code className="bg-gray-50 px-2 py-0.5 rounded font-mono text-xs font-bold">#{getTargetId(selectedReport)}</code>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Người gửi tố cáo</h3>
                    <div className="p-5 bg-white border border-gray-100 rounded-2xl shadow-sm space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">Họ tên:</span>
                            <span className="font-bold text-gray-900">{selectedReport.reporter_name || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">Mã ID:</span>
                            <code className="bg-gray-50 px-2 py-0.5 rounded font-mono text-xs font-bold">#{selectedReport.reporter_id}</code>
                        </div>
                        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-50">
                             <span className="text-gray-400">Trạng thái tài khoản:</span>
                             <span className={`text-[10px] font-black px-2 py-0.5 rounded-full tracking-widest ${
                                 ['suspended', 'banned', 'locked'].includes(selectedReport.reporter?.status || '') 
                                 ? 'text-red-600 bg-red-50' 
                                 : 'text-green-600 bg-green-50'
                             }`}>
                                {['suspended', 'banned', 'locked'].includes(selectedReport.reporter?.status || '') ? 'ĐÃ BỊ KHÓA' : 'HOẠT ĐỘNG'}
                             </span>
                        </div>
                    </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Lý do & Nội dung tố cáo</h3>
                <div className="p-6 bg-red-50/30 border border-red-100/50 rounded-2xl">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-red-500 text-lg">warning</span>
                        <span className="font-black text-red-600 text-sm">{selectedReport.report_reason?.name}</span>
                    </div>
                    <p className="text-gray-700 text-sm leading-relaxed font-medium pl-6 border-l-2 border-red-100">
                        {selectedReport.description || "Người dùng không ghi thêm mô tả chi tiết."}
                    </p>
                </div>
              </div>

              {/* Evidence */}
              {Array.isArray(selectedReport.evidence_urls) && selectedReport.evidence_urls.length > 0 && (
                <div className="space-y-4">
                   <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Bằng chứng xác thực ({selectedReport.evidence_urls.length})</h3>
                   <div className="flex flex-wrap gap-3">
                        {selectedReport.evidence_urls.map((url, i) => (
                          <div key={i} className="group relative w-32 h-32 rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-300 transition-all shadow-sm">
                            <img src={url} alt="Evidence" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="material-symbols-outlined text-white">open_in_new</span>
                            </a>
                          </div>
                        ))}
                   </div>
                </div>
              )}

              {/* Resolution History - New Section */}
              {isResolved && !isReEvaluating && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                     <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] px-1">Lịch sử xử lý từ Admin</h3>
                     <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-3xl space-y-5">
                        <div className="flex items-start gap-4">
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg">
                                <span className="material-symbols-outlined text-sm">history</span>
                            </div>
                            <div className="grid grid-cols-2 gap-8 w-full">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1">Hành động đã làm</p>
                                    <p className="font-black text-blue-700 text-sm">
                                        {ACTION_LABELS[selectedReport.resolution_action || 'none']}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-1">Kết quả công bố</p>
                                    <p className="font-bold text-gray-900 text-sm">{selectedReport.resolution || "Không có nội dung"}</p>
                                </div>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-blue-100/50">
                             <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase mb-2">Ghi chú nội bộ</p>
                             <p className="text-gray-600 text-sm italic">"{selectedReport.admin_note || "Chưa có bản ghi chú."}"</p>
                        </div>
                     </div>
                  </div>
              )}

              {/* Processing Form */}
              {(!isResolved || isReEvaluating) && (
                  <div className="space-y-6 pt-6 border-t border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-gray-900 rounded-full" />
                        <h3 className="text-lg font-black text-gray-900 tracking-tight">Quyết định xử lý</h3>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ghi chú nội bộ</label>
                            <textarea
                                value={actionNote}
                                onChange={(e) => setActionNote(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-gray-100 transition-all resize-none font-medium h-32"
                                placeholder="Viết ghi chú chỉ dành cho Admin xem..."
                            />
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Kết quả công khai</label>
                                <input
                                    type="text"
                                    value={actionResolution}
                                    onChange={(e) => setActionResolution(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-gray-100 transition-all font-bold"
                                    placeholder="Nội dung gửi cho người dùng..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Hành động cưỡng chế</label>
                                <select 
                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm focus:bg-white focus:ring-4 focus:ring-gray-100 transition-all font-black text-gray-700 cursor-pointer"
                                    value={selectedAction}
                                    onChange={(e) => setSelectedAction(e.target.value)}
                                >
                                    <option value="none">-- Chọn hành động xử phạt --</option>
                                    <optgroup label="Sản phẩm & Cửa hàng">
                                        <option value="lock_product">🔒 Khóa sản phẩm vi phạm</option>
                                        <option value="restore_product">🔓 Khôi mục sản phẩm (Mở khóa)</option>
                                        <option value="suspend_shop">🚫 Đình chỉ cửa hàng</option>
                                        <option value="activate_shop">✅ Kích hoạt lại cửa hàng</option>
                                    </optgroup>
                                    <optgroup label="Tài khoản Người dùng">
                                        <option value="suspend_reported_user">⛔ Khóa tài khoản Người BỊ TỐ CÁO</option>
                                        <option value="activate_user">👤 Mở khóa tài khoản Người BỊ TỐ CÁO</option>
                                        <option value="suspend_reporter">☣️ Khóa tài khoản Người TỐ CÁO (Sai sự thật)</option>
                                        <option value="activate_reporter">🤝 Mở khóa tài khoản Người TỐ CÁO</option>
                                    </optgroup>
                                </select>
                            </div>
                        </div>
                      </div>
                  </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {isResolved && !isReEvaluating ? (
                        <button 
                            onClick={() => setIsReEvaluating(true)}
                            className="px-6 py-3 bg-white border border-gray-200 text-gray-900 rounded-2xl text-sm font-black hover:border-blue-600 hover:text-blue-600 transition-all active:scale-95 flex items-center gap-2 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-lg">edit_note</span>
                            Xử lý lại nội dung này
                        </button>
                    ) : (
                        <button 
                            onClick={() => setSelectedReport(null)}
                            className="px-6 py-3 text-gray-400 rounded-2xl text-sm font-black hover:text-gray-900 transition-all"
                        >
                            Đóng cửa sổ
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    {(!isResolved || isReEvaluating) && (
                        <>
                            <button
                                onClick={() => handleUpdateStatus(selectedReport.id, 'under_review')}
                                disabled={actionLoading}
                                className="px-6 py-4 bg-white border border-gray-200 text-blue-600 rounded-2xl text-sm font-black hover:border-blue-600 transition-all active:scale-95"
                            >
                                Đang xem xét
                            </button>
                            <button
                                onClick={() => handleUpdateStatus(selectedReport.id, 'closed')}
                                disabled={actionLoading}
                                className="px-6 py-4 bg-gray-200 text-gray-600 rounded-2xl text-sm font-black hover:bg-gray-300 transition-all active:scale-95"
                            >
                                Bỏ qua / Đóng đơn
                            </button>
                            <button
                                onClick={() => handleUpdateStatus(selectedReport.id, 'resolved')}
                                disabled={actionLoading}
                                className="px-8 py-4 bg-gray-900 text-white rounded-2xl text-sm font-black hover:bg-black shadow-xl shadow-gray-200 transition-all active:scale-95 flex items-center gap-2"
                            >
                                {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <span className="material-symbols-outlined text-lg">verified</span>}
                                Xác nhận {isReEvaluating ? 'cập nhật' : 'giải quyết'}
                            </button>
                        </>
                    )}
                </div>
            </div>
          </div>
          <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #D1D5DB; }
            .scale-in-center { animation: scale-in-center 0.4s cubic-bezier(0.250, 0.460, 0.450, 0.940) both; }
            @keyframes scale-in-center {
              0% { transform: scale(0.95); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}
      </div>
    </AdminLayout>
  );
};
