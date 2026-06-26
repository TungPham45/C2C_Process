export interface WardOption {
  id: number;
  name: string;
  code: string;
  province_id: number;
}

export interface ProvinceOption {
  id: number;
  name: string;
  code: string;
  wards: WardOption[];
}

export interface LocationOptionsResponse {
  provinces: ProvinceOption[];
}

export interface ReceiverAddress {
  id: number;
  user_id: number;
  recipient_name: string;
  phone_number: string;
  province_code: string;
  ward_code: string;
  address_line: string;
  label?: string | null;
  is_default?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const fetchLocationOptions = async () => {
  const response = await fetch('/api/admin/locations/options');
  if (!response.ok) {
    throw new Error('Không thể tải danh sách địa giới hành chính');
  }

  return (await response.json()) as LocationOptionsResponse;
};

export const findProvinceByCode = (options: LocationOptionsResponse | null, provinceCode?: string | null) =>
  options?.provinces.find((province) => province.code === provinceCode) ?? null;

export const findWardByCode = (options: LocationOptionsResponse | null, wardCode?: string | null) => {
  if (!options || !wardCode) return null;

  for (const province of options.provinces) {
    const ward = province.wards.find((item) => item.code === wardCode);
    if (ward) return ward;
  }

  return null;
};

export const getWardOptionsForProvince = (
  options: LocationOptionsResponse | null,
  provinceCode?: string | null,
) => findProvinceByCode(options, provinceCode)?.wards ?? [];

export const formatReceiverAddressLine = (
  address: Pick<ReceiverAddress, 'address_line' | 'province_code' | 'ward_code'>,
  options: LocationOptionsResponse | null,
) => {
  const ward = findWardByCode(options, address.ward_code);
  const province = findProvinceByCode(options, address.province_code);

  return [address.address_line, ward?.name, province?.name].filter(Boolean).join(', ');
};

export const getAddressLabelMeta = (label?: string | null) => {
  const normalized = String(label ?? 'other').toLowerCase();

  if (normalized === 'home') {
    return { label: 'Nhà riêng', icon: 'home' };
  }

  if (normalized === 'office') {
    return { label: 'Công ty', icon: 'business_center' };
  }

  return { label: 'Khác', icon: 'location_on' };
};
