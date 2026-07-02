import React, { useState, useEffect, useRef } from 'react';

interface ReportReason {
  id: number;
  code: string;
  name: string;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'product' | 'shop' | 'order';
  targetId: number;
  reporterId: number;
}

const TARGET_LABELS = {
  product: { title: 'Tố Cáo Sản Phẩm', icon: 'inventory_2' },
  shop:    { title: 'Tố Cáo Cửa Hàng',  icon: 'storefront' },
  order:   { title: 'Tố Cáo Đơn Hàng',  icon: 'receipt_long' },
};

const MAX_IMAGES = 3;

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, targetType, targetId }) => {
  const [reasons, setReasons]           = useState<ReportReason[]>([]);
  const [selectedReason, setSelectedReason] = useState<number | null>(null);
  const [description, setDescription]   = useState('');
  const [evidenceImages, setEvidenceImages] = useState<string[]>([]);
  const [loading, setLoading]           = useState(false);
  const [fetchingReasons, setFetchingReasons] = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const meta = TARGET_LABELS[targetType];

  useEffect(() => {
    if (!isOpen) return;
    setSuccess(false);
    setError('');
    setDescription('');
    setSelectedReason(null);
    setEvidenceImages([]);

    setFetchingReasons(true);
    fetch(`/api/reports/reasons?category=${targetType}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: ReportReason[]) => {
        setReasons(data);
        if (data.length > 0) setSelectedReason(data[0].id);
      })
      .catch(() => {})
      .finally(() => setFetchingReasons(false));
  }, [isOpen, targetType]);

  // Compress & resize image to max 800x800, JPEG at 75% quality
  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const MAX = 800;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
            else                { width  = Math.round(width  * MAX / height); height = MAX; }
          }
          const canvas = document.createElement('canvas');
          canvas.width  = width;
          canvas.height = height;
          canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.75));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const slots = MAX_IMAGES - evidenceImages.length;
    const toProcess = files.slice(0, slots);
    for (const file of toProcess) {
      try {
        const compressed = await compressImage(file);
        setEvidenceImages(prev => [...prev, compressed]);
      } catch {
        console.warn('Failed to compress image', file.name);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  const handleSubmit = async () => {
    if (!selectedReason) { setError('Vui lòng chọn lý do tố cáo.'); return; }
    if (description.trim().length < 10) { setError('Mô tả phải có ít nhất 10 ký tự.'); return; }

    const token = localStorage.getItem('c2c_token');
    if (!token) { setError('Bạn cần đăng nhập để thực hiện tố cáo.'); return; }

    setLoading(true);
    setError('');

    const payload: Record<string, any> = {
      target_type: targetType,
      report_reason_id: selectedReason,
      description: description.trim(),
      evidence_urls: evidenceImages,
    };
    if (targetType === 'product') payload.product_id = targetId;
    if (targetType === 'shop')    payload.shop_id = targetId;
    if (targetType === 'order')   payload.shop_order_id = targetId;

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Gửi tố cáo thất bại.');
      }
      setSuccess(true);
      setTimeout(() => { onClose(); setSuccess(false); }, 2200);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(15,29,37,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-[460px] bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px] text-red-600">{meta.icon}</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">{meta.title}</h2>
                <p className="text-xs text-gray-400">ID #{targetId} · Xem xét trong 24h</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {success ? (
          /* ── Success ── */
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Gửi thành công!</h3>
            <p className="text-sm text-gray-500">Đội ngũ kiểm duyệt sẽ xem xét và phản hồi sớm nhất có thể.</p>
          </div>
        ) : (
          /* ── Form ── */
          <div className="px-5 pt-4 pb-5 overflow-y-auto max-h-[75vh] space-y-4">

            {/* Lý do */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Lý do tố cáo <span className="text-red-500">*</span>
              </label>
              {fetchingReasons ? (
                <div className="space-y-2">
                  {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />)}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {reasons.map(r => {
                    const sel = selectedReason === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => { setSelectedReason(r.id); setError(''); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                          sel
                            ? 'border-red-400 bg-red-50 text-red-700 font-semibold'
                            : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          sel ? 'border-red-500 bg-red-500' : 'border-gray-300'
                        }`}>
                          {sel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        {r.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Mô tả */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Mô tả chi tiết <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                maxLength={500}
                placeholder="Mô tả cụ thể hành vi vi phạm bạn phát hiện..."
                value={description}
                onChange={e => { setDescription(e.target.value); setError(''); }}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 resize-none focus:outline-none focus:ring-1 focus:ring-red-300 ${
                  error && description.trim().length < 10 ? 'border-red-300' : 'border-gray-200'
                }`}
              />
              <div className="flex justify-between mt-1">
                {error
                  ? <p className="text-xs text-red-500">{error}</p>
                  : <p className="text-xs text-gray-300">Tối thiểu 10 ký tự</p>
                }
                <p className="text-xs text-gray-300">{description.length}/500</p>
              </div>
            </div>

            {/* Cảnh báo */}
            <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <span className="material-symbols-outlined text-amber-500 text-[16px] shrink-0 mt-0.5">info</span>
              <p className="text-xs text-amber-800 leading-relaxed">
                Báo cáo sai sự thật có thể ảnh hưởng đến tài khoản của bạn. Chỉ báo cáo khi có bằng chứng xác thực.
              </p>
            </div>

            {/* Ảnh bằng chứng */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Ảnh bằng chứng{' '}
                <span className="normal-case font-normal text-gray-400">(tùy chọn, tối đa {MAX_IMAGES} ảnh)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {evidenceImages.map((src, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEvidenceImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity">delete</span>
                    </button>
                  </div>
                ))}
                {evidenceImages.length < MAX_IMAGES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-red-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
                    <span className="text-[9px] font-semibold uppercase">Thêm ảnh</span>
                  </button>
                )}
              </div>
              {evidenceImages.length > 0 && (
                <p className="text-xs text-gray-400 mt-1">{evidenceImages.length}/{MAX_IMAGES} ảnh · Hover để xoá</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            {/* Nút hành động */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                className="flex-1 h-11 rounded-xl font-semibold text-sm text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading || !selectedReason}
                className={`flex-[2] h-11 rounded-xl font-semibold text-sm text-white flex items-center justify-center gap-2 transition-colors ${
                  loading || !selectedReason
                    ? 'bg-red-300 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Đang gửi...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[17px]">flag</span>
                    Gửi tố cáo
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
