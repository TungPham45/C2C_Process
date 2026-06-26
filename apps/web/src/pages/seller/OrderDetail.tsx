import { FC, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { SellerLayout } from '../../components/layout/SellerLayout';
import { useOrders } from '../../hooks/useOrders';
import { resolveAssetUrl } from '../../config/api';
import { formatVnd } from '../../utils/currency';
import { getOrderPricing } from '../../utils/orderPricing';

const ORDER_STEPS = [
  { key: 'pending',   label: 'Đã đặt hàng',  icon: 'receipt_long' },
  { key: 'confirmed', label: 'Xác nhận',      icon: 'task_alt' },
  { key: 'shipped',   label: 'Đang giao',     icon: 'local_shipping' },
  { key: 'delivered', label: 'Đã giao',       icon: 'inventory_2' },
];

const statusIndex: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1,
};

const statusLabel: Record<string, string> = {
  pending: 'Chờ xử lý',
  confirmed: 'Đã xác nhận',
  shipped: 'Đang giao hàng',
  delivered: 'Đã giao hàng',
  cancelled: 'Đã hủy',
};

export const SellerOrderDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const { fetchOrderDetail, updateOrderStatus, loading, error } = useOrders();
  const [order, setOrder] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [imgErrorByItemId, setImgErrorByItemId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadOrder = async () => {
      if (id) {
        const data = await fetchOrderDetail(parseInt(id));
        if (data) {
          setOrder(data);
          setTrackingNumber(data.tracking_number || '');
          setCarrierName(data.carrier_name || '');
          setShippingError(null);
        }
      }
    };
    loadOrder();
  }, [id, fetchOrderDetail]);

  const currentStep = statusIndex[order?.status?.toLowerCase()] ?? 0;
  const isCancelled = order?.status?.toLowerCase() === 'cancelled';
  const shippingValid = carrierName.trim().length > 0 && trackingNumber.trim().length > 0;

  const advanceToNextStatus = async () => {
    if (!id || !order) return;
    const flow = ['pending', 'confirmed', 'shipped'];
    const idx = flow.indexOf(order.status?.toLowerCase());
    if (idx < 0 || idx >= flow.length - 1) return;
    const nextStatus = flow[idx + 1];

    // Business rule: must input shipping info before confirming / shipping.
    if ((nextStatus === 'confirmed' || nextStatus === 'shipped') && !shippingValid) {
      setShippingError('Vui lòng nhập Đơn vị vận chuyển và Mã vận đơn trước khi xác nhận.');
      return;
    }

    setIsUpdating(true);
    setShippingError(null);
    const success = await updateOrderStatus(parseInt(id), nextStatus, {
      tracking_number: trackingNumber,
      carrier_name: carrierName,
    });
    if (success) {
      setOrder({ ...order, status: nextStatus, tracking_number: trackingNumber, carrier_name: carrierName });
    }
    setIsUpdating(false);
  };

  const cancelOrder = async () => {
    if (!id) return;
    setIsUpdating(true);
    const success = await updateOrderStatus(parseInt(id), 'cancelled', {
      tracking_number: trackingNumber,
      carrier_name: carrierName,
    });
    if (success) {
      setOrder({ ...order, status: 'cancelled' });
    }
    setIsUpdating(false);
  };

  const getNextActionLabel = () => {
    switch (order?.status?.toLowerCase()) {
      case 'pending': return 'Xác nhận đơn hàng';
      case 'confirmed': return 'Giao cho ĐVVC';
      default: return '';
    }
  };

  const getNextActionIcon = () => {
    switch (order?.status?.toLowerCase()) {
      case 'pending': return 'check_circle';
      case 'confirmed': return 'local_shipping';
      default: return 'check';
    }
  };

  if (loading && !order) return (
    <SellerLayout pageTitle="Đang tải...">
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-12 h-12 border-4 border-[#00629d]/20 border-t-[#00629d] rounded-full animate-spin"></div>
      </div>
    </SellerLayout>
  );

  if (!order) return <SellerLayout pageTitle="Không tìm thấy"><p className="text-center py-20 text-[#707882]">Không tìm thấy đơn hàng.</p></SellerLayout>;

  const addressParts = (order.shipping_address || '').split(',').map((s: string) => s.trim());
  const customerName = addressParts[0] || 'Khách hàng';
  const addressLines = addressParts.slice(1, -1).join(', ');
  const phone = addressParts[addressParts.length - 1] || '';
  const pricing = getOrderPricing(order);
  const subtotal = pricing.itemSubtotal;
  const shippingFee = pricing.shippingFee;
  const totalPaid = pricing.finalTotal;

  const printShippingLabel = () => {
    const orderId = String(id || '');
    const safe = (v: any) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
    const items = Array.isArray(order?.items) ? order.items : [];
    const itemsHtml = items
      .slice(0, 12)
      .map((it: any) => `<tr><td class="name">${safe(it.product_name)}</td><td class="qty">x${safe(it.quantity)}</td></tr>`)
      .join('');

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Shipping Label #${safe(orderId)}</title>
    <style>
      @page { size: A5; margin: 9mm; }
      * { box-sizing: border-box; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Noto Sans", "Liberation Sans", sans-serif; color: #0f172a; }
      .sheet { width: 100%; }
      .card { border: 1.5px solid #0f172a; border-radius: 14px; overflow: hidden; }
      .pad { padding: 12px 14px; }
      .header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; }
      .brand { display: flex; align-items: center; gap: 10px; }
      .logo { width: 28px; height: 28px; border-radius: 10px; background: linear-gradient(135deg, #2563eb, #38bdf8); border: 1px solid rgba(2,6,23,0.15); }
      .brandName { font-weight: 900; letter-spacing: .02em; }
      .badge { display: inline-flex; align-items: center; gap: 6px; border: 1px solid rgba(15,23,42,0.35); background: white; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 800; }
      .muted { color: #64748b; font-size: 11px; }
      .orderCode { font-size: 18px; font-weight: 1000; letter-spacing: .06em; }
      .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .section { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
      .sectionTitle { font-size: 12px; font-weight: 900; letter-spacing: .03em; color: #0f172a; background: #f8fafc; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
      .kv { display: grid; grid-template-columns: 88px 1fr; gap: 6px 10px; font-size: 12px; padding: 10px; }
      .k { color: #334155; font-weight: 800; }
      .v { font-weight: 700; color: #0f172a; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; letter-spacing: .02em; }
      .receiver { border: 2px solid #0f172a; }
      .receiver .kv { grid-template-columns: 64px 1fr; }
      .receiver .v { font-size: 13px; }
      .addr { line-height: 1.25; }
      .table { width: 100%; border-collapse: collapse; }
      .table th { text-align: left; font-size: 11px; color: #334155; font-weight: 900; padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
      .table td { font-size: 11px; padding: 7px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
      .qty { text-align: right; white-space: nowrap; font-weight: 900; }
      .totals { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; }
      .totalLabel { font-size: 11px; color: #334155; font-weight: 900; }
      .totalValue { font-size: 14px; font-weight: 1000; letter-spacing: .02em; }
      .cut { border-top: 2px dashed #94a3b8; margin: 12px 0 0; }
      .foot { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 10px 14px 12px; }
      .mini { font-size: 10px; color: #64748b; }
      .barcode { height: 34px; border: 1px solid #e2e8f0; border-radius: 10px; background: repeating-linear-gradient(90deg, #0f172a 0, #0f172a 2px, transparent 2px, transparent 6px); opacity: .15; }
      .nowrap { white-space: nowrap; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="card">
        <div class="header pad">
          <div>
            <div class="brand">
              <div class="logo"></div>
              <div>
                <div class="brandName">SERENE</div>
                <div class="muted">Nhãn vận chuyển</div>
              </div>
            </div>
            <div style="margin-top:10px" class="badge">
              <span class="mono">#${safe(orderId)}</span>
              <span class="muted">•</span>
              <span class="muted nowrap">${safe(new Date().toLocaleString('vi-VN'))}</span>
            </div>
          </div>
          <div style="text-align:right">
            <div class="muted">Mã đơn</div>
            <div class="orderCode mono">${safe(orderId)}</div>
            <div style="margin-top:8px" class="barcode" aria-hidden="true"></div>
          </div>
        </div>

        <div class="pad">
          <div class="grid2">
            <div class="section receiver">
              <div class="sectionTitle">NGƯỜI NHẬN</div>
              <div class="kv">
                <div class="k">Tên</div><div class="v">${safe(customerName || '—')}</div>
                <div class="k">SĐT</div><div class="v mono">${safe(phone || '—')}</div>
                <div class="k">Địa chỉ</div><div class="v addr">${safe(addressLines || order.shipping_address || '—')}</div>
              </div>
            </div>

            <div class="section">
              <div class="sectionTitle">VẬN CHUYỂN</div>
              <div class="kv">
                <div class="k">ĐVVC</div><div class="v">${safe(carrierName || '—')}</div>
                <div class="k">Mã VĐ</div><div class="v mono">${safe(trackingNumber || '—')}</div>
                <div class="k">Thu hộ</div><div class="v">${safe('0')} VND</div>
              </div>
            </div>
          </div>

          <div style="height:10px"></div>

          <div class="section">
            <div class="sectionTitle">HÀNG TRONG GÓI (${safe(Math.min(items.length, 12))}${items.length > 12 ? '+' : ''})</div>
            <table class="table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th style="width:72px; text-align:right">SL</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml || '<tr><td class="muted">Không có sản phẩm.</td><td></td></tr>'}
              </tbody>
            </table>
            <div class="totals">
              <div class="totalLabel">Tổng thanh toán</div>
              <div class="totalValue">${safe(totalPaid.toLocaleString('vi-VN'))} VND</div>
            </div>
          </div>

          <div class="cut"></div>
        </div>

        <div class="foot">
          <div class="mini">
            Vui lòng kiểm tra <b>ĐVVC</b> và <b>Mã vận đơn</b> trước khi bàn giao.
          </div>
          <div class="mini mono">SERENE • LABEL</div>
        </div>
      </div>
    </div>

    <script>
      window.onload = () => { window.print(); };
    </script>
  </body>
</html>`;

    // NOTE: Avoid `noopener,noreferrer` here; some browsers block document.write() into that window.
    const w = window.open('', '_blank', 'width=700,height=900');
    if (!w) return;
    try {
      w.opener = null;
    } catch {
      // ignore
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  return (
    <SellerLayout pageTitle={`Chi tiết đơn hàng #${id}`}>
      <div className="max-w-6xl">
        <header className="flex items-center gap-6 mb-10">
          <Link to="/seller/orders" className="w-12 h-12 rounded-2xl bg-white border border-[#dbeaf5] flex items-center justify-center text-[#0f1d25] hover:bg-[#f5faff] transition-all shadow-sm">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Chi tiết Đơn hàng #{id}</h1>
            <p className="text-[#707882] font-medium mt-1">Đặt ngày {new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
          </div>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-[#ffdad6] text-[#ba1a1a] rounded-2xl font-bold flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-8 space-y-8">

            {/* Status Update Card with Stepper */}
            <section className="bg-white rounded-[2rem] p-8 border border-[#dbeaf5] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-black text-[#0f1d25]">Cập nhật trạng thái</h2>
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isCancelled
                    ? 'bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/30'
                    : 'bg-[#cfe5ff] text-[#00629d] border border-[#00629d]/20'
                }`}>
                  {statusLabel[order.status?.toLowerCase()] || order.status}
                </span>
              </div>

              {/* Progress Stepper */}
              {!isCancelled && (
                <div className="relative flex items-start justify-between px-2 mb-8">
                  <div className="absolute top-5 left-[calc(12.5%)] right-[calc(12.5%)] h-[3px] bg-[#e4e9f0] rounded-full z-0">
                    <div
                      className="h-full bg-gradient-to-r from-[#00629d] to-[#42a5f5] rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(0, (currentStep / (ORDER_STEPS.length - 1)) * 100)}%` }}
                    />
                  </div>
                  {ORDER_STEPS.map((step, idx) => {
                    const isComplete = idx < currentStep;
                    const isActive = idx === currentStep;
                    return (
                      <div key={step.key} className="flex flex-col items-center z-10 w-1/4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
                          isComplete
                            ? 'bg-[#00629d] text-white shadow-md shadow-blue-400/30'
                            : isActive
                            ? 'bg-white border-[3px] border-[#00629d] text-[#00629d] shadow-lg shadow-blue-200/40 scale-110'
                            : 'bg-[#f0f3f8] text-[#bfc7d3] border-2 border-[#e4e9f0]'
                        }`}>
                          {isComplete ? (
                            <span className="material-symbols-outlined text-lg">check</span>
                          ) : (
                            <span className="material-symbols-outlined text-lg">{step.icon}</span>
                          )}
                        </div>
                        <p className={`mt-3 text-xs font-bold text-center ${isComplete || isActive ? 'text-[#0f1d25]' : 'text-[#bfc7d3]'}`}>
                          {step.label}
                        </p>
                        {isActive && <p className="text-[10px] text-[#00629d] font-bold mt-0.5">Hiện tại</p>}
                      </div>
                    );
                  })}
                </div>
              )}

              {isCancelled && (
                <div className="flex items-center gap-4 p-5 bg-[#ffdad6]/30 rounded-2xl border border-[#ba1a1a]/10 mb-6">
                  <span className="material-symbols-outlined text-[#ba1a1a] text-2xl">cancel</span>
                  <div>
                    <p className="font-bold text-[#ba1a1a] text-sm">Đơn hàng này đã bị hủy.</p>
                    <p className="text-xs text-[#707882] mt-0.5">Nếu có thắc mắc, vui lòng liên hệ bộ phận hỗ trợ.</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {!isCancelled && (order.status?.toLowerCase() === 'pending' || order.status?.toLowerCase() === 'confirmed') && (
                <div className="flex gap-4 pt-4 border-t border-[#e4e9f0]">
                  <button
                    onClick={advanceToNextStatus}
                    disabled={
                      isUpdating ||
                      ((order.status?.toLowerCase() === 'pending' || order.status?.toLowerCase() === 'confirmed') && !shippingValid)
                    }
                    className="flex-1 h-14 bg-[#00629d] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#004e7c] transition-all shadow-lg shadow-blue-900/10 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-xl">{getNextActionIcon()}</span>
                    {isUpdating ? 'Đang xử lý...' : getNextActionLabel()}
                  </button>
                  {order.status?.toLowerCase() === 'pending' && (
                    <button
                      onClick={cancelOrder}
                      disabled={isUpdating}
                      className="h-14 px-6 bg-white text-[#ba1a1a] border border-[#ffdad6] rounded-2xl font-bold flex items-center gap-2 hover:bg-[#ffdad6]/20 transition-all disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-xl">cancel</span>
                      Hủy đơn
                    </button>
                  )}
                </div>
              )}

              {/* Status Message when Shipped */}
              {order.status?.toLowerCase() === 'shipped' && (
                <div className="flex items-center gap-4 p-5 bg-[#e0efff]/30 rounded-2xl border border-[#00629d]/10 mt-6">
                  <span className="material-symbols-outlined text-[#00629d] text-2xl">hourglass_empty</span>
                  <div>
                    <p className="font-bold text-[#00629d] text-sm">Đang chờ người mua xác nhận đã nhận hàng.</p>
                    <p className="text-xs text-[#707882] mt-0.5">Một khi người mua xác nhận, đơn hàng sẽ chuyển sang trạng thái "Đã giao".</p>
                  </div>
                </div>
              )}

              {shippingError && (
                <div className="mt-4 rounded-2xl border border-[#ffdad6] bg-[#ffdad6]/30 p-4 text-sm font-semibold text-[#ba1a1a] flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5">info</span>
                  <div className="min-w-0">
                    <p>{shippingError}</p>
                    <p className="mt-1 text-xs font-medium text-[#707882]">
                      Mẹo: nhập đúng ĐVVC + mã vận đơn để người mua theo dõi hành trình.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Shipping Info (only show when status needs it) */}
            {['pending', 'confirmed', 'shipped'].includes(order.status?.toLowerCase()) && (
              <section className="bg-white rounded-[2rem] p-8 border border-[#dbeaf5] shadow-sm">
                <h2 className="text-lg font-black text-[#0f1d25] mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#00629d]">local_shipping</span>
                  Thông tin vận chuyển
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#707882] ml-1">Đơn vị vận chuyển</label>
                    <input
                      type="text"
                      value={carrierName}
                      onChange={(e) => {
                        setCarrierName(e.target.value);
                        setShippingError(null);
                      }}
                      placeholder="VD: Giao hàng nhanh, J&T..."
                      className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[#707882] ml-1">Mã vận đơn</label>
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => {
                        setTrackingNumber(e.target.value);
                        setShippingError(null);
                      }}
                      placeholder="Nhập mã vận đơn từ nhà vận chuyển"
                      className="w-full h-14 px-6 bg-[#f5faff] border border-transparent focus:bg-white focus:border-[#00629d]/20 rounded-2xl outline-none transition-all font-mono text-sm"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Package Items */}
            <section className="bg-white rounded-[2rem] p-8 border border-[#dbeaf5] shadow-sm">
              <h2 className="text-lg font-black text-[#0f1d25] mb-6">Sản phẩm trong đơn</h2>
              <div className="divide-y divide-[#f0f3f8]">
                {order.items.map((item: any) => (
                  <div key={item.id} className="flex gap-6 py-5 first:pt-0 last:pb-0 items-center">
                    <div className="w-20 h-20 rounded-2xl bg-[#f5faff] flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {(() => {
                        const src = resolveAssetUrl(item.product_image_url || item.product_thumbnail_url || '');
                        const hasErr = !!imgErrorByItemId[String(item.id)];
                        if (!src || hasErr) {
                          return (
                            <span className="material-symbols-outlined text-[#bfc7d3] text-4xl">
                              inventory_2
                            </span>
                          );
                        }
                        return (
                          <img
                            src={src}
                            alt={item.product_name || 'Sản phẩm'}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            onError={() =>
                              setImgErrorByItemId((prev) => ({ ...prev, [String(item.id)]: true }))
                            }
                          />
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#0f1d25] text-sm line-clamp-1">{item.product_name}</h4>
                      <p className="text-xs text-[#707882] mt-1 font-medium">Số lượng: {item.quantity}</p>
                    </div>
                    <div className="text-right font-black text-[#0f1d25]">
                      {formatVnd(item.price_at_purchase)}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-[#e4e9f0] flex items-center justify-between">
                <p className="text-[10px] text-[#707882] font-bold uppercase tracking-widest">Tổng cộng</p>
                <p className="text-xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">{formatVnd(totalPaid)}</p>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            {/* Customer Info */}
            <section className="bg-white rounded-[2rem] p-8 border border-[#e4e9f0] shadow-sm">
              <h3 className="text-lg font-black text-[#0f1d25] mb-6">Thông tin nhận hàng</h3>
              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#e0efff] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#00629d] text-lg">person</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#707882] font-black uppercase tracking-widest mb-0.5">Người nhận</p>
                    <p className="text-sm font-bold text-[#0f1d25]">{customerName}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-[#e0efff] rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#00629d] text-lg">location_on</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#707882] font-black uppercase tracking-widest mb-0.5">Địa chỉ</p>
                    <p className="text-sm text-[#404751] font-medium leading-relaxed">{addressLines || 'Chưa có địa chỉ'}</p>
                  </div>
                </div>
                {phone && (
                  <div className="flex gap-4">
                    <div className="w-10 h-10 bg-[#e0efff] rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[#00629d] text-lg">call</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#707882] font-black uppercase tracking-widest mb-0.5">Số điện thoại</p>
                      <p className="text-sm font-bold text-[#0f1d25]">{phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Order Summary */}
            <section className="bg-white rounded-[2rem] p-8 border border-[#e4e9f0] shadow-sm">
              <h3 className="text-lg font-black text-[#0f1d25] mb-6">Tóm tắt đơn hàng</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Mã đơn hàng</span>
                  <span className="font-black text-[#00629d]">#SER-{String(order.id).padStart(5, '0')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Ngày đặt hàng</span>
                  <span className="font-bold text-[#0f1d25]">{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
              <div className="border-t border-[#e4e9f0] mt-4 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Tạm tính</span>
                  <span className="font-bold text-[#0f1d25]">{formatVnd(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#707882]">Phí vận chuyển</span>
                  <span className="font-bold text-[#0f1d25]">{formatVnd(shippingFee)}</span>
                </div>
                {pricing.totalVoucherDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#00629d] font-bold">Voucher</span>
                    <span className="text-[#00629d] font-bold">-{formatVnd(pricing.totalVoucherDiscount)}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-[#e4e9f0] mt-4 pt-4 flex justify-between items-baseline">
                <span className="text-sm font-bold text-[#0f1d25]">Tổng thanh toán</span>
                <span className="text-xl font-black text-[#00629d] font-['Plus_Jakarta_Sans']">{formatVnd(totalPaid)}</span>
              </div>
            </section>

            {/* Print Label */}
            <button
              type="button"
              onClick={printShippingLabel}
              className="w-full py-4 bg-white border border-[#dbeaf5] rounded-2xl font-bold text-sm text-[#00629d] flex items-center justify-center gap-2 hover:bg-[#f5faff] transition-all"
              title={!shippingValid ? 'Bạn nên nhập ĐVVC + mã vận đơn để nhãn đầy đủ.' : 'In nhãn vận chuyển'}
            >
              <span className="material-symbols-outlined text-lg">print</span>
              In nhãn vận chuyển
            </button>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
};
