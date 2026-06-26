export const sellerVoucherStatusOptions = [
  { value: 'draft', label: 'Bản Nháp' },
  { value: 'scheduled', label: 'Lên Lịch' },
  { value: 'active', label: 'Hoạt Động' },
  { value: 'paused', label: 'Tạm Dừng' },
] as const;

export const sellerVoucherTargetOptions = [
  { value: 'all_buyers', label: 'Tất Cả Người Mua' },
  { value: 'new_buyer', label: 'Khách Hàng Mới' },
  { value: 'followers', label: 'Khách Theo Dõi Shop' },
] as const;

export type SellerVoucherTargetType =
  | 'all_buyers'
  | 'new_buyer'
  | 'followers';

export interface SellerVoucher {
  id: number;
  shop_id: number;
  code: string;
  target_type: SellerVoucherTargetType;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  min_spend: number;
  max_discount: number | null;
  total_quantity: number | null;
  used_count: number;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'expired';
  start_date: string;
  end_date: string;
  max_per_user: number;
}

export interface SellerVoucherStats extends SellerVoucher {
  redeemedCount: number;
  totalQuantity: number;
  capacity: string;
  dailyAvg: string;
  expiresIn: number;
}

export interface SellerVoucherFormData {
  code: string;
  target_type: SellerVoucherTargetType;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number | string;
  min_spend: number | string;
  max_discount: number | string | null;
  total_quantity: number | string | null;
  max_per_user: number | string;
  status: string;
  start_date: string;
  end_date: string;
}

export interface SellerShopContext {
  shop: {
    id: number;
    name: string | null;
    status: string | null;
  } | null;
}

export function getSellerAuthHeaders() {
  const token = localStorage.getItem('c2c_token');
  return token ? { Authorization: `Bearer ${token}` } : ({} as Record<string, string>);
}

export function toSellerVoucherFormData(data: SellerVoucherStats): SellerVoucherFormData {
  return {
    code: data.code,
    target_type: data.target_type,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    min_spend: data.min_spend,
    max_discount: data.max_discount,
    total_quantity: data.total_quantity,
    max_per_user: data.max_per_user,
    status: data.status,
    start_date: data.start_date.split('T')[0],
    end_date: data.end_date.split('T')[0],
  };
}

export function buildSellerVoucherPayload(formData: SellerVoucherFormData) {
  return {
    code: formData.code,
    target_type: formData.target_type,
    discount_type: formData.discount_type,
    discount_value: Number(formData.discount_value),
    min_spend: Number(formData.min_spend),
    max_discount: formData.max_discount ? Number(formData.max_discount) : null,
    total_quantity: formData.total_quantity ? Number(formData.total_quantity) : null,
    max_per_user: Number(formData.max_per_user),
    status: formData.status,
    start_date: formData.start_date,
    end_date: formData.end_date,
  };
}

export function getSellerVoucherTargetLabel(targetType: string) {
  if (targetType === 'new_buyer') {
    return 'Người Mua Mới';
  }

  if (targetType === 'followers' || targetType === 'follower') {
    return 'Chỉ Người Theo Dõi';
  }

  return 'Tất Cả Người Mua';
}
