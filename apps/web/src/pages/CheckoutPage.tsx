import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MarketplaceLayout } from '../components/layout/MarketplaceLayout';
import { useOrders } from '../hooks/useOrders';
import { useWallet } from '../hooks/useWallet';
import { AUTH_API_URL, resolveAssetUrl } from '../config/api';
import {
  fetchLocationOptions,
  findProvinceByCode,
  findWardByCode,
  formatReceiverAddressLine,
  getAddressLabelMeta,
  LocationOptionsResponse,
  ReceiverAddress,
} from '../utils/locationOptions';

const CHECKOUT_SESSION_KEY = 'c2c_checkout_state';

interface CheckoutVoucher {
  id: number;
  shop_id?: number | null;
  code: string;
  target_type: string;
  discount_type: string;
  discount_value: number | string;
  min_spend: number | string;
  max_discount?: number | string | null;
  end_date: string;
}

interface CheckoutVoucherOption {
  claim_id: number;
  claimed_at: string;
  qualifying_amount: number;
  estimated_discount: number;
  voucher: CheckoutVoucher;
}

interface CheckoutVoucherGroup {
  shop_id: number;
  subtotal: number;
  vouchers: CheckoutVoucherOption[];
}

interface CheckoutVoucherResponse {
  summary: {
    order_subtotal: number;
    total_shipping_fee: number;
    total_before_vouchers: number;
  };
  platform_vouchers: CheckoutVoucherOption[];
  shop_vouchers: CheckoutVoucherGroup[];
}

const SHIPPING_FEE_PER_SHOP = 30000;

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} ₫`;

const parsePrice = (value: unknown) => {
  if (typeof value === 'number') return value;
  const normalized = Number(String(value ?? '').replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(normalized) ? normalized : 0;
};

const calculateVoucherDiscount = (voucher: CheckoutVoucher, amount: number) => {
  const minSpend = Number(voucher.min_spend ?? 0);
  if (amount < minSpend) {
    return 0;
  }

  const discountValue = Number(voucher.discount_value ?? 0);
  const rawDiscount =
    voucher.discount_type === 'percentage'
      ? (amount * discountValue) / 100
      : discountValue;
  const maxDiscount = voucher.max_discount == null ? null : Number(voucher.max_discount);
  const cappedDiscount = maxDiscount == null ? rawDiscount : Math.min(rawDiscount, maxDiscount);

  return Math.min(amount, Math.max(0, cappedDiscount));
};

export const CheckoutPage = () => {
  const { createOrder, fetchCheckoutVouchers, loading, error } = useOrders();
  const { wallet, fetchWallet } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = React.useMemo(() => {
    if (location.state) {
      return location.state as any;
    }

    const persistedState = sessionStorage.getItem(CHECKOUT_SESSION_KEY);
    if (!persistedState) {
      return null;
    }

    try {
      return JSON.parse(persistedState);
    } catch {
      sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
      return null;
    }
  }, [location.state]);

  const [savedAddresses, setSavedAddresses] = useState<ReceiverAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<ReceiverAddress | null>(null);
  const [locationOptions, setLocationOptions] = useState<LocationOptionsResponse | null>(null);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressError, setAddressError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('e_wallet');
  const [voucherData, setVoucherData] = useState<CheckoutVoucherResponse | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [selectedShopVoucherClaimIds, setSelectedShopVoucherClaimIds] = useState<Record<number, number | null>>({});

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  useEffect(() => {
    if (location.state) {
      sessionStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify(location.state));
      return;
    }

    if (!stateData) {
      sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
    }
  }, [location.state, stateData]);

  useEffect(() => {
    if (!stateData) {
      navigate('/cart', { replace: true });
    }
  }, [navigate, stateData]);

  useEffect(() => {
    let ignore = false;

    const loadAddresses = async () => {
      const token = localStorage.getItem('c2c_token');
      if (!token) {
        if (!ignore) {
          setAddressLoading(false);
        }
        return;
      }

      try {
        setAddressLoading(true);
        setAddressError('');

        const [addressResponse, optionsResponse] = await Promise.all([
          fetch(`${AUTH_API_URL}/addresses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetchLocationOptions(),
        ]);

        if (!addressResponse.ok) {
          throw new Error('Không thể tải địa chỉ nhận hàng');
        }

        const addressData = (await addressResponse.json()) as ReceiverAddress[];
        if (ignore) return;

        setSavedAddresses(addressData);
        setLocationOptions(optionsResponse);
        // Fix race condition: only set initial selection if none is currently selected
        setSelectedAddress((current) => current ?? (addressData.find((address) => address.is_default) ?? addressData[0] ?? null));
      } catch (loadError: any) {
        if (!ignore) {
          setAddressError(loadError.message || 'Không thể tải địa chỉ nhận hàng');
        }
      } finally {
        if (!ignore) {
          setAddressLoading(false);
        }
      }
    };

    loadAddresses();

    return () => {
      ignore = true;
    };
  }, []);

  const getSinglePrice = () => {
    if (!stateData?.product) return 0;
    return parsePrice((stateData.variant?.price_override || stateData.variant?.price) ?? stateData.product.base_price);
  };

  const getCartItemPrice = (item: any) =>
    parsePrice((item.variant?.price_override || item.variant?.price) ?? item.product?.base_price);

  const isMultiItem = stateData?.fromCart === true;

  const groups = isMultiItem ? stateData.groupedItems : [
    {
      shop: {
        id: stateData?.product?.shop_id || 0,
        name: stateData?.product?.shop?.name || 'Cửa hàng',
      },
      items: [
        {
          id: stateData?.variant?.id || stateData?.product?.id || 0,
          cart_item_id: null,
          product: stateData?.product || { name: 'Sản phẩm' },
          variant: stateData?.variant,
          quantity: stateData?.quantity || 1,
          price: getSinglePrice(),
          image: stateData?.variant?.image_url || stateData?.product?.thumbnail_url || '',
        }
      ]
    }
  ];

  const shopOrders = groups.map((group: any) => {
    let groupSubtotal = 0;
    const items = group.items.map((item: any) => {
      const price = isMultiItem ? getCartItemPrice(item) : item.price;
      groupSubtotal += price * item.quantity;

      return {
        product_variant_id: isMultiItem ? item.product_variant_id : item.id,
        product_name: typeof item.product?.name === 'string' ? item.product.name : 'Sản phẩm',
        quantity: Number(item.quantity) || 1,
        price_at_purchase: price,
      };
    });

    return {
      shop_id: Number(group.shop.id),
      shop_name: group.shop.name,
      subtotal: groupSubtotal,
      shipping_fee: SHIPPING_FEE_PER_SHOP,
      items,
    };
  });

  const subTotal = shopOrders.reduce((sum: number, shopOrder: any) => sum + shopOrder.subtotal, 0);
  const totalShippingFee = shopOrders.reduce((sum: number, shopOrder: any) => sum + shopOrder.shipping_fee, 0);
  const checkoutKey = JSON.stringify(
    shopOrders.map((shopOrder: any) => ({
      shop_id: shopOrder.shop_id,
      shipping_fee: shopOrder.shipping_fee,
      items: shopOrder.items.map((item: any) => ({
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
      })),
    })),
  );

  useEffect(() => {
    let isMounted = true;

    const loadCheckoutVouchers = async () => {
      setVoucherLoading(true);
      const result = await fetchCheckoutVouchers({
        shop_orders: shopOrders.map((shopOrder: any) => ({
          shop_id: shopOrder.shop_id,
          shipping_fee: shopOrder.shipping_fee,
          items: shopOrder.items,
        })),
      });

      if (!isMounted) {
        return;
      }

      setVoucherData(result);
      setSelectedShopVoucherClaimIds((current) => {
        const next: Record<number, number | null> = {};

        shopOrders.forEach((shopOrder: any) => {
          const matchingGroup = result?.shop_vouchers.find((group: any) => group.shop_id === shopOrder.shop_id);
          const currentSelection = current[shopOrder.shop_id];
          next[shopOrder.shop_id] =
            matchingGroup?.vouchers.some((voucher: any) => voucher.claim_id === currentSelection)
              ? currentSelection
              : null;
        });

        return next;
      });
      setVoucherLoading(false);
    };

    loadCheckoutVouchers();

    return () => {
      isMounted = false;
    };
  }, [checkoutKey]);

  const shopDiscountTotal = shopOrders.reduce((sum: number, shopOrder: any) => {
    const selectedClaimId = selectedShopVoucherClaimIds[shopOrder.shop_id];
    const selectedVoucher = voucherData?.shop_vouchers
      .find((group) => group.shop_id === shopOrder.shop_id)
      ?.vouchers.find((voucher) => voucher.claim_id === selectedClaimId);

    return sum + (selectedVoucher ? calculateVoucherDiscount(selectedVoucher.voucher, shopOrder.subtotal) : 0);
  }, 0);

  const subtotalAfterShopDiscount = Math.max(0, subTotal - shopDiscountTotal);
  const totalPayment = Math.max(0, subtotalAfterShopDiscount + totalShippingFee);
  // chỉnh địa chỉ trả về
  const formatShippingAddressForOrder = (address: ReceiverAddress) => {
    const wardName = findWardByCode(locationOptions, address.ward_code)?.name || address.ward_code;
    const provinceName = findProvinceByCode(locationOptions, address.province_code)?.name || address.province_code;

    return `${address.recipient_name}, ${address.address_line}, ${wardName}, ${provinceName}, ${address.phone_number}`;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAddress) {
      setAddressError('Vui lòng chọn địa chỉ nhận hàng trước khi đặt đơn.');
      return;
    }

    if (selectedAddress.status === 'Cần thay đổi') {
      setAddressError('Địa chỉ hiện tại không còn hợp lệ. Vui lòng cập nhật lại địa chỉ giao hàng.');
      return;
    }

    const formattedAddress = formatShippingAddressForOrder(selectedAddress);

    const orderData: any = {
      total_payment: totalPayment,
      payment_method: paymentMethod,
      shipping_address: formattedAddress,
      shop_orders: shopOrders.map((shopOrder: any) => ({
        shop_id: shopOrder.shop_id,
        subtotal: shopOrder.subtotal,
        shipping_fee: shopOrder.shipping_fee,
        items: shopOrder.items,
      })),
      shop_voucher_claim_ids: selectedShopVoucherClaimIds,
    };

    if (isMultiItem && stateData.cartItems) {
      orderData.cart_item_ids = stateData.cartItems.map((item: any) => item.id);
    }

    const result = await createOrder(orderData);

    if (result) {
      sessionStorage.removeItem(CHECKOUT_SESSION_KEY);
      navigate('/order-success', { state: { orderId: result.id } });
    }
  };

  const toggleShopVoucher = (shopId: number, claimId: number) => {
    setSelectedShopVoucherClaimIds((current) => ({
      ...current,
      [shopId]: current[shopId] === claimId ? null : claimId,
    }));
  };

  if (!stateData) {
    return null;
  }

  return (
    <MarketplaceLayout>
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <h1 className="text-4xl font-black font-['Plus_Jakarta_Sans'] mb-12 flex items-center gap-4 text-[#0f1d25]">
          <span className="material-symbols-outlined text-4xl text-[#00629d]">shopping_cart_checkout</span>
          Thanh toán
        </h1>

        {error && (
          <div className="mb-8 p-4 bg-[#ffdad6] text-[#ba1a1a] rounded-2xl font-bold flex items-center gap-3">
            <span className="material-symbols-outlined">error</span>
            {error}
          </div>
        )}

        <div className="grid grid-cols-12 gap-8 lg:gap-12">
          <div className="col-span-12 lg:col-span-7 space-y-8">
            <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-[#0f1d25]">
                <span className="w-8 h-8 rounded-lg bg-[#e1f0fb] text-[#00629d] flex items-center justify-center text-sm">1</span>
                Thông tin giao hàng
              </h2>

              {addressError && (
                <div className="mb-5 rounded-2xl border border-[#ffdad6] bg-[#fff8f7] px-4 py-3 text-sm font-semibold text-[#ba1a1a]">
                  {addressError}
                </div>
              )}

              {addressLoading ? (
                <div className="h-36 rounded-[1.75rem] bg-[#f5faff] animate-pulse" />
              ) : selectedAddress ? (
                <div className="space-y-5">
                  <div className="rounded-[1.75rem] border border-[#dbeaf5] bg-[#f8fbff] p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#e1f0fb] text-[#00629d] flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined">{getAddressLabelMeta(selectedAddress.label).icon}</span>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-black text-[#0f1d25]">{selectedAddress.recipient_name}</p>
                            {selectedAddress.is_default && (
                              <span className="px-3 py-1 rounded-full bg-[#0f1d25] text-white text-[11px] font-black uppercase tracking-wider">
                                Mặc định
                              </span>
                            )}
                            {selectedAddress.status === 'Cần thay đổi' && (
                              <span className="px-3 py-1 rounded-full bg-[#ba1a1a] text-white text-[11px] font-black uppercase tracking-wider animate-pulse">
                                Cần thay đổi
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm font-semibold text-[#404751]">{selectedAddress.phone_number}</p>
                          <p className="mt-3 text-sm text-[#5d6975] leading-6">
                            {formatReceiverAddressLine(selectedAddress, locationOptions)}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate('/addresses?returnTo=/checkout', { state: { checkoutState: stateData } })}
                        className="inline-flex items-center gap-2 rounded-full border border-[#dbeaf5] bg-white px-4 py-2 text-sm font-bold text-[#00629d] hover:bg-[#f5faff] transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit_location</span>
                        Quản lý địa chỉ
                      </button>
                    </div>
                  </div>

                  {savedAddresses.length > 1 && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-[#707882]">Chọn địa chỉ khác</p>
                      <div className="grid gap-3">
                        {savedAddresses.map((address) => {
                          const isActive = selectedAddress.id === address.id;
                          return (
                            <button
                              key={address.id}
                              type="button"
                              onClick={() => setSelectedAddress(address)}
                              className={`text-left rounded-[1.5rem] border p-4 transition-all ${isActive
                                ? 'border-[#00629d] bg-white shadow-sm'
                                : 'border-[#e4e9f0] bg-white hover:border-[#cfe4f6]'
                                }`}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-bold text-[#0f1d25] flex flex-wrap items-center gap-2">
                                      {getAddressLabelMeta(address.label).label} · {address.recipient_name}
                                      {address.status === 'Cần thay đổi' && (
                                        <span className="px-2 py-0.5 rounded-full bg-[#ba1a1a] text-white text-[10px] font-bold uppercase animate-pulse">
                                          Cần thay đổi
                                        </span>
                                      )}
                                    </p>
                                  <p className="text-sm text-[#707882] mt-1">{address.phone_number}</p>
                                  <p className="text-sm text-[#5d6975] mt-2 leading-6">
                                    {formatReceiverAddressLine(address, locationOptions)}
                                  </p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 ${isActive ? 'border-[#00629d] bg-[#00629d]' : 'border-[#c8d3de]'}`}></div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-[#dbeaf5] bg-[#fbfdff] px-6 py-8 text-center">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-[#e1f0fb] text-[#00629d] flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl">location_on</span>
                  </div>
                  <p className="mt-5 text-lg font-bold text-[#0f1d25]">Bạn chưa có địa chỉ nhận hàng</p>
                  <p className="mt-2 text-sm text-[#707882]">Tạo địa chỉ trước khi thanh toán để hệ thống ghi nhận nơi giao đơn.</p>
                  <button
                    type="button"
                    onClick={() => navigate('/addresses?returnTo=/checkout', { state: { checkoutState: stateData } })}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#00629d] px-5 py-3 text-white text-sm font-bold hover:bg-[#004e7c] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
                    Thêm địa chỉ nhận hàng
                  </button>
                </div>
              )}
            </section>

            <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-[#0f1d25]">
                <span className="w-8 h-8 rounded-lg bg-[#e1f0fb] text-[#00629d] flex items-center justify-center text-sm">2</span>
                Phương thức thanh toán
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'e_wallet', label: 'Thanh toán online', icon: 'account_balance_wallet' },
                  { id: 'cod', label: 'Thanh toán sau khi nhận hàng (COD)', icon: 'payments' },
                ].map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex items-center gap-4 p-5 lg:p-6 rounded-2xl border-2 transition-all ${paymentMethod === method.id
                      ? 'bg-[#f5faff] border-[#00629d] text-[#00629d]'
                      : 'bg-white border-[#f0f3f8] hover:border-[#dbeaf5] text-[#404751]'
                      }`}
                  >
                    <span className="material-symbols-outlined">{method.icon}</span>
                    <span className="font-bold text-sm lg:text-base">{method.label}</span>
                  </button>
                ))}
              </div>

              {paymentMethod === 'e_wallet' && wallet ? (
                <div className={`mt-6 p-5 rounded-2xl border ${wallet.balance < totalPayment ? 'bg-[#fff0f0] border-[#ffdad6] text-[#ba1a1a]' : 'bg-[#f5faff] border-[#cfe4f6] text-[#00629d]'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm">Số dư ví của bạn:</span>
                    <span className="font-black font-['Plus_Jakarta_Sans']">{formatCurrency(wallet.balance)}</span>
                  </div>
                  <p className="text-sm text-[#3b5568]">
                    Thanh toán online sẽ trừ tiền ngay trong ví của bạn và chuyển vào ví hệ thống.
                  </p>
                  {wallet.balance < totalPayment && (
                    <div className="flex items-center justify-between mt-4 text-sm font-semibold">
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">error</span>
                        Số dư không đủ để thanh toán
                      </span>
                      <a href="/wallet" target="_blank" rel="opener" className="underline hover:text-[#93000a]">Nạp thêm tiền</a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6 p-5 rounded-2xl border bg-[#fff8e8] border-[#f7d88a] text-[#9a6700]">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined">local_shipping</span>
                    <div>
                      <p className="font-bold text-sm">Thanh toán khi nhận hàng</p>
                      <p className="mt-1 text-sm text-[#7a5a17]">
                        Bạn thanh toán cho đơn vị giao hàng khi nhận được sản phẩm.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm">
              <h2 className="text-xl font-bold mb-8 flex items-center gap-3 text-[#0f1d25]">
                <span className="w-8 h-8 rounded-lg bg-[#e1f0fb] text-[#00629d] flex items-center justify-center text-sm">3</span>
                VOUCHER
              </h2>

              <div className="space-y-8">
                <div className="space-y-6">
                  {shopOrders.map((shopOrder: any) => {
                    const voucherGroup = voucherData?.shop_vouchers.find((group) => group.shop_id === shopOrder.shop_id);
                    const selectedClaimId = selectedShopVoucherClaimIds[shopOrder.shop_id];

                    return (
                      <div key={shopOrder.shop_id} className="rounded-[1.75rem] border border-[#e4e9f0] p-6 bg-[#fbfdff]">
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <div>
                            <h3 className="font-bold text-[#0f1d25]">{shopOrder.shop_name}</h3>
                            <p className="text-sm text-[#707882]">Tạm Tính Shop: {formatCurrency(shopOrder.subtotal)}</p>
                          </div>
                          {selectedClaimId && (
                            <button
                              type="button"
                              onClick={() => toggleShopVoucher(shopOrder.shop_id, selectedClaimId)}
                              className="text-sm font-bold text-[#00629d]"
                            >
                              Bỏ Chọn
                            </button>
                          )}
                        </div>

                        {voucherLoading ? (
                          <div className="h-20 rounded-2xl bg-white animate-pulse"></div>
                        ) : voucherGroup?.vouchers.length ? (
                          <div className="space-y-3">
                            {voucherGroup.vouchers.map((option) => {
                              const isSelected = selectedClaimId === option.claim_id;
                              return (
                                <button
                                  key={option.claim_id}
                                  type="button"
                                  onClick={() => toggleShopVoucher(shopOrder.shop_id, option.claim_id)}
                                  className={`w-full text-left p-4 rounded-2xl border transition-all ${isSelected
                                    ? 'border-[#00629d] bg-white'
                                    : 'border-[#e4e9f0] bg-white hover:border-[#cfe4f6]'
                                    }`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="font-bold text-[#0f1d25]">{option.voucher.code}</p>
                                      <p className="text-sm text-[#707882] mt-1">
                                        Ước Tính Giảm {formatCurrency(option.estimated_discount)}
                                      </p>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 ${isSelected ? 'border-[#00629d] bg-[#00629d]' : 'border-[#c8d3de]'}`}></div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-[#dbeaf5] px-4 py-5 text-sm text-[#707882]">
                            Không có voucher phù hợp cho shop này.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <div className="col-span-12 lg:col-span-5">
            <div className="sticky top-32 space-y-8">
              <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm">
                <h2 className="text-xl font-black mb-6 text-[#0f1d25] font-['Plus_Jakarta_Sans']">Sản phẩm thanh toán</h2>

                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-[#dbeaf5] scrollbar-track-transparent">
                  {groups.map((group: any, index: number) => (
                    <div key={index} className="space-y-4 pb-6 border-b border-[#f0f3f8] last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[#00629d]">storefront</span>
                        <span className="font-bold text-sm text-[#0f1d25]">{group.shop.name}</span>
                      </div>

                      {group.items.map((item: any, itemIndex: number) => {
                        const price = isMultiItem ? getCartItemPrice(item) : item.price;
                        const image = isMultiItem ? (item.variant?.image_url || item.product?.thumbnail_url) : item.image;
                        const displayImage = resolveAssetUrl(image || '');

                        return (
                          <div key={itemIndex} className="flex gap-4">
                            <div className="w-[60px] h-[60px] rounded-xl bg-[#f0f3f8] flex-shrink-0 overflow-hidden">
                              {displayImage ? (
                                <img src={displayImage} alt="thumbnail" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-[#a0aab5]">image</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-[#0f1d25] line-clamp-1">{item.product?.name || item.name}</p>
                              {item.variant?.attributes && (
                                <p className="text-[#707882] text-[11px] mt-0.5">
                                  {Object.entries(item.variant.attributes).map(([, value]) => `${value}`).join(', ')}
                                </p>
                              )}
                              <div className="flex justify-between items-center mt-1">
                                <p className="text-[#00629d] font-bold text-sm">{formatCurrency(price)}</p>
                                <p className="text-[#707882] text-xs font-semibold">x{item.quantity}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white border border-[#e4e9f0] rounded-[2rem] p-8 lg:p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-[#00629d]"></div>

                <div className="space-y-4 text-sm font-medium border-b border-[#f0f3f8] pb-6 mb-6">
                  <div className="flex justify-between text-[#707882]">
                    <span>Tổng phụ</span>
                    <span className="font-bold text-[#0f1d25]">{formatCurrency(subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#707882]">
                    <span>Phí vận chuyển ({groups.length} kiện)</span>
                    <span className="font-bold text-[#0f1d25]">{formatCurrency(totalShippingFee)}</span>
                  </div>
                  <div className="flex justify-between text-[#707882]">
                    <span>Giảm giá shop</span>
                    <span className="font-bold text-[#0f1d25]">- {formatCurrency(shopDiscountTotal)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <span className="text-[#0f1d25] font-bold">Tổng thanh toán</span>
                  <div className="text-2xl font-black text-[#00629d] font-['Plus_Jakarta_Sans']">
                    {formatCurrency(totalPayment)}
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={loading || voucherLoading || (paymentMethod === 'e_wallet' && (wallet?.balance || 0) < totalPayment)}
                  className="w-full mt-8 h-14 bg-[#0f1d25] text-white rounded-2xl font-bold text-base transition-all hover:bg-[#00629d] shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Xác nhận đặt hàng
                      <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>
    </MarketplaceLayout>
  );
};
