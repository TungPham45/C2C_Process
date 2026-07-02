import { FC, FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { AUTH_API_URL } from '../config/api';
import {
  fetchLocationOptions,
  formatReceiverAddressLine,
  getAddressLabelMeta,
  getWardOptionsForProvince,
  LocationOptionsResponse,
  ReceiverAddress,
} from '../utils/locationOptions';

interface AddressFormState {
  recipient_name: string;
  phone_number: string;
  province_code: string;
  ward_code: string;
  address_line: string;
  label: string;
  is_default: boolean;
}

const createEmptyForm = (fallbackName = ''): AddressFormState => ({
  recipient_name: fallbackName,
  phone_number: '',
  province_code: '',
  ward_code: '',
  address_line: '',
  label: 'home',
  is_default: false,
});

const MAX_ADDRESSES = 5;

export const ShippingAddressesPage: FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const checkoutState = (location.state as { checkoutState?: any } | null)?.checkoutState;
  const [currentUserName, setCurrentUserName] = useState('Người dùng');
  const [addresses, setAddresses] = useState<ReceiverAddress[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationOptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ReceiverAddress | null>(null);
  const [formState, setFormState] = useState<AddressFormState>(createEmptyForm());

  const returnTo = new URLSearchParams(location.search).get('returnTo');
  const token = localStorage.getItem('c2c_token');

  const wardOptions = useMemo(
    () => getWardOptionsForProvince(locationOptions, formState.province_code),
    [formState.province_code, locationOptions],
  );

  const defaultAddress = useMemo(
    () => addresses.find((address) => address.is_default) ?? null,
    [addresses],
  );

  const loadData = async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const userRaw = localStorage.getItem('c2c_user');
      if (userRaw) {
        try {
          const parsed = JSON.parse(userRaw);
          setCurrentUserName(parsed.full_name || parsed.email?.split('@')[0] || 'Người dùng');
        } catch {
          setCurrentUserName('Người dùng');
        }
      }

      const [addressResponse, optionsResponse] = await Promise.all([
        fetch(`${AUTH_API_URL}/addresses`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetchLocationOptions(),
      ]);

      if (!addressResponse.ok) {
        throw new Error('Không thể tải danh sách địa chỉ nhận hàng');
      }

      setAddresses((await addressResponse.json()) as ReceiverAddress[]);
      setLocationOptions(optionsResponse);
    } catch (loadError: any) {
      setError(loadError.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    if (addresses.length >= MAX_ADDRESSES) {
      setError(`Bạn chỉ có thể lưu tối đa ${MAX_ADDRESSES} địa chỉ nhận hàng.`);
      return;
    }
    setEditingAddress(null);
    setFormState(createEmptyForm(currentUserName));
    setShowModal(true);
    setError('');
  };

  const openEditModal = (address: ReceiverAddress) => {
    setEditingAddress(address);
    setFormState({
      recipient_name: address.recipient_name,
      phone_number: address.phone_number,
      province_code: address.province_code,
      ward_code: address.ward_code,
      address_line: address.address_line,
      label: address.label || 'other',
      is_default: Boolean(address.is_default),
    });
    setShowModal(true);
    setError('');
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingAddress(null);
    setFormState(createEmptyForm(currentUserName));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    try {
      setSaving(true);
      setError('');

      if (!editingAddress && addresses.length >= MAX_ADDRESSES) {
        throw new Error(`Bạn chỉ có thể lưu tối đa ${MAX_ADDRESSES} địa chỉ nhận hàng.`);
      }

      const response = await fetch(
        editingAddress ? `${AUTH_API_URL}/addresses/${editingAddress.id}` : `${AUTH_API_URL}/addresses`,
        {
          method: editingAddress ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formState),
        },
      );

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.message || 'Không thể lưu địa chỉ nhận hàng');
      }

      closeModal();
      await loadData();
    } catch (submitError: any) {
      setError(submitError.message || 'Không thể lưu địa chỉ nhận hàng');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (addressId: number) => {
    if (!token) return;
    if (!window.confirm('Bạn có chắc muốn xoá địa chỉ này?')) return;

    try {
      setError('');
      const response = await fetch(`${AUTH_API_URL}/addresses/${addressId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.message || 'Không thể xoá địa chỉ');
      }

      await loadData();
    } catch (deleteError: any) {
      setError(deleteError.message || 'Không thể xoá địa chỉ');
    }
  };

  const handleSetDefault = async (addressId: number) => {
    if (!token) return;

    try {
      setError('');
      const response = await fetch(`${AUTH_API_URL}/addresses/${addressId}/default`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(json?.message || 'Không thể thiết lập mặc định');
      }

      await loadData();
    } catch (defaultError: any) {
      setError(defaultError.message || 'Không thể thiết lập mặc định');
    }
  };

  return (
    <MarketplaceLayout>
      <div className="max-w-6xl mx-auto px-6 pb-32">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-[#dbeaf5] bg-white px-8 py-10 shadow-[0_20px_60px_rgba(24,119,242,0.08)]">
          <div className="absolute -top-16 right-0 h-48 w-48 rounded-full bg-[#1877F2]/10 blur-3xl" />
          <div className="absolute bottom-0 left-16 h-24 w-24 rounded-full bg-[#99cbff]/20 blur-2xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#1877F2]">Tài khoản mua hàng</p>
              <h1 className="mt-3 text-4xl font-black font-['Plus_Jakarta_Sans'] text-[#0f1d25]">Địa chỉ nhận hàng</h1>
              <p className="mt-3 max-w-2xl text-sm text-[#707882]">Quản lý thông tin giao hàng của bạn.</p>
              <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full bg-[#eef6ff] px-4 py-2 font-bold text-[#1877F2]">
                  {addresses.length} / {MAX_ADDRESSES} địa chỉ đã lưu
                </span>
                {defaultAddress && (
                  <span className="rounded-full bg-[#0f1d25] px-4 py-2 font-bold text-white">
                    Mặc định: {defaultAddress.recipient_name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {returnTo && (
                <Link
                  to={returnTo}
                  state={checkoutState}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#dbeaf5] bg-white px-5 py-3 text-sm font-bold text-[#0f1d25] transition hover:border-[#1877F2]/40 hover:bg-[#f5faff]"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  Quay lại thanh toán
                </Link>
              )}
              <button
                type="button"
                onClick={openCreateModal}
                disabled={addresses.length >= MAX_ADDRESSES}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1877F2] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-[#0f68d8] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Thêm địa chỉ mới
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-[1.5rem] border border-[#ffdad6] bg-[#fff8f7] px-5 py-4 text-sm font-semibold text-[#ba1a1a]">
            {error}
          </div>
        )}

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            { label: 'Người nhận chính', value: defaultAddress?.recipient_name || currentUserName, icon: 'person' },
            { label: 'Địa chỉ mặc định', value: defaultAddress ? 'Đã thiết lập' : 'Chưa có', icon: 'verified' },
            { label: 'Sẵn sàng cho checkout', value: addresses.length > 0 ? 'Có thể sử dụng' : 'Cần thêm địa chỉ', icon: 'local_shipping' },
          ].map((item) => (
            <article key={item.label} className="rounded-[2rem] border border-[#e1f0fb] bg-white p-6 shadow-[0_8px_32px_rgba(15,29,37,0.04)]">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef6ff] text-[#1877F2]">
                  <span className="material-symbols-outlined">{item.icon}</span>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#9aa6b2]">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-[#0f1d25]">{item.value}</p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-8 space-y-5">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-[2rem] border border-[#e1f0fb] bg-white" />
            ))
          ) : addresses.length > 0 ? (
            addresses.map((address) => {
              const labelMeta = getAddressLabelMeta(address.label);

              return (
                <article
                  key={address.id}
                  className="group rounded-[2rem] border border-[#e1f0fb] bg-white p-6 shadow-[0_10px_35px_rgba(15,29,37,0.04)] transition hover:-translate-y-0.5 hover:border-[#1877F2]/30 hover:shadow-[0_18px_45px_rgba(24,119,242,0.10)]"
                >
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    <div className="flex items-start gap-5 flex-1">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#eef6ff] text-[#1877F2]">
                        <span className="material-symbols-outlined text-[26px]">{labelMeta.icon}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="text-xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">{labelMeta.label}</h2>
                          {address.is_default && (
                            <span className="rounded-full bg-[#0f1d25] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                              Mặc định
                            </span>
                          )}
                          {address.status === 'Cần thay đổi' && (
                            <span className="rounded-full bg-[#ba1a1a] px-3 py-1 text-[11px] font-black uppercase tracking-wider text-white animate-pulse">
                              Cần thay đổi
                            </span>
                          )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-[#0f1d25]">
                          <span>{address.recipient_name}</span>
                          <span className="text-[#c4d0db]">|</span>
                          <span>{address.phone_number}</span>
                        </div>

                        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#5a6672]">
                          {formatReceiverAddressLine(address, locationOptions)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => openEditModal(address)}
                        className="rounded-full bg-[#eef6ff] px-4 py-2 text-sm font-bold text-[#1877F2] transition hover:bg-[#dfeeff]"
                      >
                        Chỉnh sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(address.id)}
                        className="rounded-full bg-[#f3f6f8] px-4 py-2 text-sm font-bold text-[#6a7681] transition hover:bg-[#e8edf1]"
                      >
                        Xóa
                      </button>
                      {!address.is_default && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(address.id)}
                          className="rounded-full border border-[#d3e5ff] px-4 py-2 text-sm font-bold text-[#1877F2] transition hover:border-[#1877F2]/40 hover:bg-[#f5faff]"
                        >
                          Thiết lập mặc định
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-[2rem] border border-dashed border-[#cfe0ee] bg-white px-8 py-16 text-center shadow-sm">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#eef6ff] text-[#1877F2]">
                <span className="material-symbols-outlined text-4xl">location_on</span>
              </div>
              <h2 className="mt-6 text-2xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">Chưa có địa chỉ nhận hàng</h2>
              <p className="mt-3 text-sm text-[#707882]">Thêm địa chỉ đầu tiên để dùng nhanh khi thanh toán đơn hàng.</p>
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#1877F2] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#0f68d8]"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Tạo địa chỉ đầu tiên
              </button>
            </div>
          )}
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-[#0f1d25]/50" onClick={closeModal} aria-label="Close address modal" />
          <div className="relative z-10 w-full max-w-3xl rounded-[2rem] border border-[#dbeaf5] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#1877F2]">Quản lý giao hàng</p>
                <h2 className="mt-2 text-2xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">
                  {editingAddress ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5faff] text-[#6a7681] transition hover:bg-[#e9f5ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#707882]">Người nhận</span>
                  <input
                    value={formState.recipient_name}
                    onChange={(event) => setFormState((current) => ({ ...current, recipient_name: event.target.value }))}
                    className="h-14 w-full rounded-2xl border border-[#dbeaf5] bg-[#f8fbff] px-5 outline-none transition focus:border-[#1877F2]"
                    placeholder="Nhập tên người nhận"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#707882]">Số điện thoại</span>
                  <input
                    value={formState.phone_number}
                    onChange={(event) => setFormState((current) => ({ ...current, phone_number: event.target.value }))}
                    className="h-14 w-full rounded-2xl border border-[#dbeaf5] bg-[#f8fbff] px-5 outline-none transition focus:border-[#1877F2]"
                    placeholder="Nhập số điện thoại"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#707882]">Tỉnh/Thành phố</span>
                  <select
                    value={formState.province_code}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        province_code: event.target.value,
                        ward_code: '',
                      }))
                    }
                    className="h-14 w-full rounded-2xl border border-[#dbeaf5] bg-[#f8fbff] px-5 outline-none transition focus:border-[#1877F2]"
                  >
                    <option value="">Chọn tỉnh/thành phố</option>
                    {locationOptions?.provinces.map((province) => (
                      <option key={province.code} value={province.code}>
                        {province.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#707882]">Phường/Xã</span>
                  <select
                    value={formState.ward_code}
                    onChange={(event) => setFormState((current) => ({ ...current, ward_code: event.target.value }))}
                    className="h-14 w-full rounded-2xl border border-[#dbeaf5] bg-[#f8fbff] px-5 outline-none transition focus:border-[#1877F2]"
                    disabled={!formState.province_code}
                  >
                    <option value="">Chọn phường/xã</option>
                    {wardOptions.map((ward) => (
                      <option key={ward.code} value={ward.code}>
                        {ward.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#707882]">Địa chỉ chi tiết</span>
                  <textarea
                    value={formState.address_line}
                    onChange={(event) => setFormState((current) => ({ ...current, address_line: event.target.value }))}
                    rows={4}
                    className="w-full rounded-2xl border border-[#dbeaf5] bg-[#f8fbff] px-5 py-4 outline-none transition focus:border-[#1877F2] resize-none"
                    placeholder="Số nhà, tên đường, thôn xóm..."
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[#707882]">Loại địa chỉ</span>
                  <select
                    value={formState.label}
                    onChange={(event) => setFormState((current) => ({ ...current, label: event.target.value }))}
                    className="h-14 w-full rounded-2xl border border-[#dbeaf5] bg-[#f8fbff] px-5 outline-none transition focus:border-[#1877F2]"
                  >
                    <option value="home">Nhà riêng</option>
                    <option value="office">Công ty</option>
                    <option value="other">Khác</option>
                  </select>
                </label>

                <label className="flex items-center gap-3 rounded-2xl border border-[#dbeaf5] bg-[#f8fbff] px-5 py-4 text-sm font-semibold text-[#0f1d25]">
                  <input
                    type="checkbox"
                    checked={formState.is_default}
                    onChange={(event) => setFormState((current) => ({ ...current, is_default: event.target.checked }))}
                  />
                  Đặt làm địa chỉ mặc định
                </label>
              </div>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-[#dbeaf5] px-5 py-3 text-sm font-bold text-[#5b6772] transition hover:bg-[#f5faff]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-[#1877F2] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#0f68d8] disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : editingAddress ? 'Lưu thay đổi' : 'Tạo địa chỉ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MarketplaceLayout>
  );
};

export default ShippingAddressesPage;
