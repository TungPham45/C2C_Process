import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  HiOutlineArrowDownTray,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineMagnifyingGlass,
  HiOutlinePlus,
  HiOutlineXMark,
} from 'react-icons/hi2';

type LocationLevel = 'province' | 'ward';
type LocationStatus = 'active' | 'inactive';
type LocationTypeFilter = 'all' | LocationLevel;
type StatusFilter = 'all' | LocationStatus;

interface LocationSummary {
  totalProvinces: number;
  totalWards: number;
  pendingSync: number;
}

interface LocationNode {
  id: number;
  name: string;
  code: string;
  level: LocationLevel;
  unitType: string;
  status: LocationStatus;
  isActive: boolean;
  parentId: number | null;
  parentName: string | null;
  childrenCount: number;
  updatedAt: string | null;
  children: LocationNode[];
}

interface LocationResponse {
  items: LocationNode[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface LocationOption {
  id: number;
  name: string;
  code: string;
}

interface LocationOptionsResponse {
  provinces: LocationOption[];
}

interface LocationFormState {
  level: LocationLevel;
  name: string;
  code: string;
  administrativeType: string;
  parentId: string;
  isActive: boolean;
}

interface EditingState {
  id: number;
  level: LocationLevel;
  parentId: number | null;
  parentName: string | null;
}

const numberFormatter = new Intl.NumberFormat('vi-VN');

const administrativeTypeOptions: Record<LocationLevel, Array<{ value: string; label: string }>> = {
  province: [
    { value: 'tinh', label: 'Tỉnh' },
    { value: 'thanh_pho', label: 'Thành phố' },
  ],
  ward: [
    { value: 'phuong', label: 'Phường' },
    { value: 'xa', label: 'Xã' },
    { value: 'dac_khu', label: 'Đặc khu' },
  ],
};

const createDefaultForm = (level: LocationLevel = 'province', parentId?: number | null): LocationFormState => ({
  level,
  name: '',
  code: '',
  administrativeType: administrativeTypeOptions[level][0]?.value ?? '',
  parentId: parentId ? String(parentId) : '',
  isActive: true,
});

const formatNumber = (value: number | undefined) => numberFormatter.format(value ?? 0);

const getStatusClasses = (status: LocationStatus) =>
  status === 'active'
    ? 'bg-[#e9f5ff] text-[#00629d]'
    : 'bg-[#eef1f7] text-[#5b677a]';

const flattenRows = (rows: LocationNode[]): Array<LocationNode & { depth: number }> => {
  const flattened: Array<LocationNode & { depth: number }> = [];

  const walk = (items: LocationNode[], depth: number) => {
    items.forEach((item) => {
      flattened.push({ ...item, depth });
      if (item.children.length > 0) {
        walk(item.children, depth + 1);
      }
    });
  };

  walk(rows, 0);
  return flattened;
};

const collectExpandableRowKeys = (rows: LocationNode[]) => {
  const keys = new Set<string>();

  const walk = (items: LocationNode[]) => {
    items.forEach((item) => {
      if (item.children.length > 0) {
        keys.add(`${item.level}-${item.id}`);
        walk(item.children);
      }
    });
  };

  walk(rows);
  return keys;
};

const getLevelLabel = (level: LocationLevel) => {
  if (level === 'province') return 'Tỉnh/Thành phố';
  return 'Phường/Xã';
};

const LocationManagement = () => {
  const [summary, setSummary] = useState<LocationSummary | null>(null);
  const [rows, setRows] = useState<LocationNode[]>([]);
  const [pagination, setPagination] = useState<LocationResponse['pagination']>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<LocationTypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [locationOptions, setLocationOptions] = useState<LocationOptionsResponse>({
    provinces: [],
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<EditingState | null>(null);
  const [formState, setFormState] = useState<LocationFormState>(createDefaultForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [togglingRowKey, setTogglingRowKey] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchQuery.trim());

  const flattenedVisibleRows = useMemo(() => flattenRows(rows), [rows]);

  useEffect(() => {
    let ignore = false;

    const loadParentOptions = async () => {
      try {
        const response = await fetch('/api/admin/locations/options');
        if (!response.ok) {
          throw new Error('Không thể tải tùy chọn địa giới');
        }

        const data = (await response.json()) as LocationOptionsResponse;
        if (!ignore) {
          setLocationOptions(data);
        }
      } catch (optionsError) {
        if (!ignore) {
          console.error(optionsError);
        }
      }
    };

    loadParentOptions();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          search: deferredSearch,
          type: typeFilter,
          status: statusFilter,
          page: String(page),
          limit: '10',
        });

        const [summaryResponse, listResponse] = await Promise.all([
          fetch('/api/admin/locations/summary'),
          fetch(`/api/admin/locations?${params.toString()}`),
        ]);

        if (!summaryResponse.ok) {
          throw new Error('Không thể tải số liệu địa giới hành chính');
        }

        if (!listResponse.ok) {
          const message = await listResponse.text();
          throw new Error(message || 'Không thể tải danh sách địa giới hành chính');
        }

        const [summaryData, listData] = await Promise.all([
          summaryResponse.json() as Promise<LocationSummary>,
          listResponse.json() as Promise<LocationResponse>,
        ]);

        if (!ignore) {
          setSummary(summaryData);
          setRows(listData.items);
          setPagination(listData.pagination);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [deferredSearch, typeFilter, statusFilter, page]);

  useEffect(() => {
    if (deferredSearch || typeFilter !== 'all' || statusFilter !== 'all') {
      setExpandedRows(collectExpandableRowKeys(rows));
    }
  }, [rows, deferredSearch, typeFilter, statusFilter]);

  const availableParentOptions = useMemo(() => {
    if (formState.level === 'ward') {
      return locationOptions.provinces.map((province) => ({
        value: String(province.id),
        label: `${province.name} (${province.code})`,
      }));
    }

    return [];
  }, [formState.level, locationOptions]);

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(1, pagination.page - 1);
    const end = Math.min(pagination.totalPages, start + 2);

    for (let current = start; current <= end; current += 1) {
      pages.push(current);
    }

    return pages;
  }, [pagination.page, pagination.totalPages]);

  const openCreateModal = (level: LocationLevel = 'province', parentId?: number | null) => {
    setEditingLocation(null);
    setFormError(null);
    setFormState(createDefaultForm(level, parentId));
    setIsModalOpen(true);
  };

  const openEditModal = (node: LocationNode) => {
    const defaultAdministrativeType =
      administrativeTypeOptions[node.level].find((option) => option.label === node.unitType)?.value ??
      administrativeTypeOptions[node.level][0]?.value ??
      '';

    setEditingLocation({
      id: node.id,
      level: node.level,
      parentId: node.parentId,
      parentName: node.parentName,
    });
    setFormError(null);
    setFormState({
      level: node.level,
      name: node.name,
      code: node.code,
      administrativeType: defaultAdministrativeType,
      parentId: node.parentId ? String(node.parentId) : '',
      isActive: node.isActive,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingLocation(null);
    setFormError(null);
    setFormState(createDefaultForm());
  };

  const refreshOptions = async () => {
    const response = await fetch('/api/admin/locations/options');
    if (!response.ok) return;
    setLocationOptions((await response.json()) as LocationOptionsResponse);
  };

  const refreshTable = async () => {
    const params = new URLSearchParams({
      search: deferredSearch,
      type: typeFilter,
      status: statusFilter,
      page: String(page),
      limit: '10',
    });

    const [summaryResponse, listResponse] = await Promise.all([
      fetch('/api/admin/locations/summary'),
      fetch(`/api/admin/locations?${params.toString()}`),
    ]);

    if (!summaryResponse.ok || !listResponse.ok) {
      throw new Error('Không thể làm mới dữ liệu địa giới');
    }

    const [summaryData, listData] = await Promise.all([
      summaryResponse.json() as Promise<LocationSummary>,
      listResponse.json() as Promise<LocationResponse>,
    ]);

    setSummary(summaryData);
    setRows(listData.items);
    setPagination(listData.pagination);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formState.name.trim()) {
      setFormError('Tên đơn vị là bắt buộc.');
      return;
    }

    if (!formState.code.trim()) {
      setFormError('Mã đơn vị là bắt buộc.');
      return;
    }

    if (formState.level !== 'province' && !formState.parentId) {
      setFormError('Vui lòng chọn đơn vị cha.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      const payload = {
        level: formState.level,
        name: formState.name.trim(),
        code: formState.code.trim(),
        administrativeType: formState.administrativeType,
        parentId: formState.parentId ? Number(formState.parentId) : null,
        isActive: formState.isActive,
      };

      const url = editingLocation
        ? `/api/admin/locations/${editingLocation.level}/${editingLocation.id}`
        : '/api/admin/locations';

      const response = await fetch(url, {
        method: editingLocation ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Không thể lưu địa giới');
      }

      await Promise.all([refreshOptions(), refreshTable()]);
      closeModal();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'Không thể lưu địa giới');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusToggle = async (node: LocationNode) => {
    if (node.isActive) {
      if (
        !window.confirm(
          `Bạn có chắc muốn tắt ${getLevelLabel(node.level)} "${node.name}"? Tất cả địa chỉ người dùng thuộc khu vực này sẽ được chuyển sang trạng thái "Cần thay đổi".`,
        )
      ) {
        return;
      }
    }

    const rowKey = `${node.level}-${node.id}`;

    try {
      setTogglingRowKey(rowKey);
      const response = await fetch(`/api/admin/locations/${node.level}/${node.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !node.isActive }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Không thể cập nhật trạng thái');
      }

      await refreshTable();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Không thể cập nhật trạng thái');
    } finally {
      setTogglingRowKey(null);
    }
  };

  const handleDelete = async (node: LocationNode) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xoá ${getLevelLabel(node.level)} "${node.name}"? Tất cả địa chỉ người dùng thuộc khu vực này sẽ được chuyển sang trạng thái "Cần thay đổi".`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/locations/${node.level}/${node.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Không thể xoá địa giới');
      }

      await Promise.all([refreshOptions(), refreshTable()]);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Không thể xoá địa giới');
    }
  };

  const handleExport = () => {
    const lines = [
      ['Level', 'Name', 'Code', 'Type', 'Status', 'Parent'].join(','),
      ...flattenedVisibleRows.map((row) =>
        [
          row.level,
          `"${row.name.replace(/"/g, '""')}"`,
          row.code,
          `"${row.unitType.replace(/"/g, '""')}"`,
          row.isActive ? 'Active' : 'Inactive',
          `"${(row.parentName ?? '').replace(/"/g, '""')}"`,
        ].join(','),
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `administrative-boundaries-page-${pagination.page}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleExpand = (rowKey: string) => {
    setExpandedRows((previous) => {
      const next = new Set(previous);

      if (next.has(rowKey)) {
        next.delete(rowKey);
      } else {
        next.add(rowKey);
      }

      return next;
    });
  };

  const renderRows = (items: LocationNode[], depth = 0): React.ReactNode[] =>
    items.flatMap((item) => {
      const rowKey = `${item.level}-${item.id}`;
      const isExpanded = expandedRows.has(rowKey);
      const canExpand = item.children.length > 0;

      const row = (
        <tr key={rowKey} className="border-b border-[#f5faff] transition-colors hover:bg-[#f5faff]/50">
          <td className="px-6 py-5 align-top">
            <div className="flex items-start gap-3" style={{ paddingLeft: `${depth * 20}px` }}>
              {canExpand ? (
                <button
                  type="button"
                  onClick={() => toggleExpand(rowKey)}
                  className="mt-0.5 rounded-full bg-[#e9f5ff] p-1 text-[#00629d]"
                  aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
                >
                  {isExpanded ? <HiOutlineChevronDown className="h-4 w-4" /> : <HiOutlineChevronRight className="h-4 w-4" />}
                </button>
              ) : (
                <span className="mt-0.5 h-6 w-6 rounded-full bg-[#f5faff]" />
              )}
              <div>
                <div className="text-sm font-bold text-[#0f1d25]">{item.name}</div>
                <div className="text-xs text-[#707882]">{item.code}</div>
              </div>
            </div>
          </td>
          <td className="px-6 py-5 align-top text-sm font-medium text-[#4b6472]">{item.unitType}</td>
          <td className="px-6 py-5 align-top">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(item.status)}`}>
              {item.isActive ? 'Hoạt động' : 'Tạm tắt'}
            </span>
          </td>
          <td className="px-6 py-5 align-top">
            <div className="flex flex-wrap gap-2">
              {item.level !== 'ward' && (
                <button
                  type="button"
                  onClick={() => openCreateModal('ward', item.id)}
                  className="rounded-full border border-[#cfe5ff] px-3 py-2 text-xs font-semibold text-[#00629d] transition hover:bg-[#e9f5ff]"
                >
                  Thêm Phường/Xã
                </button>
              )}
              <button
                type="button"
                onClick={() => openEditModal(item)}
                className="rounded-full border border-[#d6e7f6] px-3 py-2 text-xs font-semibold text-[#4b6472] transition hover:bg-[#f5faff]"
              >
                Sửa
              </button>
              <button
                type="button"
                onClick={() => handleStatusToggle(item)}
                disabled={togglingRowKey === rowKey}
                className={`rounded-full px-3 py-2 text-xs font-semibold text-white transition disabled:opacity-60 ${
                  item.isActive ? 'bg-[#ba1a1a] hover:bg-[#981515]' : 'bg-[#00629d] hover:bg-[#005183]'
                }`}
              >
                {togglingRowKey === rowKey ? 'Đang lưu...' : item.isActive ? 'Tắt' : 'Bật'}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="rounded-full bg-[#ba1a1a]/10 px-3 py-2 text-xs font-semibold text-[#ba1a1a] transition hover:bg-[#ba1a1a]/20"
              >
                Xóa
              </button>
            </div>
          </td>
        </tr>
      );

      if (!canExpand || !isExpanded) {
        return [row];
      }

      return [row, ...renderRows(item.children, depth + 1)];
    });

  return (
    <AdminLayout
      pageTitle="Quản lý Địa giới Hành chính"
      pageSubtitle="Quản lý tỉnh thành và phường xã của toàn hệ thống"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-[2rem] border border-[#e1f0fb] bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#0f1d25] font-['Plus_Jakarta_Sans']">Quản lý Địa giới Hành chính</h3>
              <p className="mt-2 text-sm text-[#707882]">
                Quản lý cấu trúc hành chính và trạng thái sử dụng trong hệ thống.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#d6e7f6] px-4 py-3 text-sm font-semibold text-[#4b6472] transition hover:bg-[#f5faff]"
              >
                <HiOutlineArrowDownTray className="h-5 w-5" />
                Export
              </button>
              <button
                type="button"
                onClick={() => openCreateModal('province')}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#00629d] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#005183]"
              >
                <HiOutlinePlus className="h-5 w-5" />
                Thêm Tỉnh/Thành phố
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            { label: 'Tỉnh/Thành phố', value: formatNumber(summary?.totalProvinces) },
            { label: 'Phường/Xã', value: formatNumber(summary?.totalWards) },
            { label: 'Pending Sync', value: formatNumber(summary?.pendingSync) },
          ].map((card) => (
            <article
              key={card.label}
              className="rounded-[2rem] border border-[#e1f0fb] bg-white p-6 shadow-[0_8px_40px_rgba(0,0,0,0.03)]"
            >
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#707882]">{card.label}</div>
              <div className="mt-3 text-3xl font-black text-[#0f1d25] font-['Plus_Jakarta_Sans']">{card.value}</div>
            </article>
          ))}
        </section>

        <section className="rounded-[2rem] border border-[#e1f0fb] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="border-b border-[#f5faff] p-8">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="grid gap-3 md:grid-cols-3 xl:flex-1">
                <label className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#707882]">
                    <HiOutlineMagnifyingGlass className="h-5 w-5" />
                  </span>
                  <input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Tìm theo tên hoặc mã"
                    className="w-full rounded-xl border border-[#cfe5ff] bg-[#f5faff] py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#00629d] focus:ring-1 focus:ring-[#00629d]"
                  />
                </label>

                <select
                  value={typeFilter}
                  onChange={(event) => {
                    setTypeFilter(event.target.value as LocationTypeFilter);
                    setPage(1);
                  }}
                  className="rounded-xl border border-[#cfe5ff] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00629d]"
                >
                  <option value="all">Tất cả loại</option>
                  <option value="province">Tỉnh/Thành phố</option>
                  <option value="ward">Phường/Xã</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value as StatusFilter);
                    setPage(1);
                  }}
                  className="rounded-xl border border-[#cfe5ff] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#00629d]"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Hoạt động</option>
                  <option value="inactive">Tạm tắt</option>
                </select>
              </div>

              <div className="text-sm font-medium text-[#707882]">
                {formatNumber(pagination.total)} đơn vị cấp gốc
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-[#ffdad6] bg-[#fff8f7] px-4 py-3 text-sm text-[#ba1a1a]">
                {error}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#f5faff] text-[10px] font-bold uppercase tracking-widest text-[#707882]">
                  <th className="px-8 py-5">Tên & Mã</th>
                  <th className="px-6 py-5">Loại</th>
                  <th className="px-6 py-5">Trạng thái</th>
                  <th className="px-8 py-5">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-b border-[#f5faff]">
                      <td className="px-8 py-5" colSpan={4}>
                        <div className="h-12 animate-pulse rounded-2xl bg-[#eef4ff]" />
                      </td>
                    </tr>
                  ))
                ) : rows.length > 0 ? (
                  renderRows(rows)
                ) : (
                  <tr>
                    <td className="px-8 py-20 text-center text-sm text-[#707882]" colSpan={4}>
                      Không có dữ liệu phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-4 border-t border-[#f5faff] px-8 py-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-[#707882]">
              Trang {pagination.page}/{pagination.totalPages || 1}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page === 1}
                className="rounded-xl border border-[#d6e7f6] p-2 text-[#4b6472] disabled:opacity-40"
                aria-label="Previous page"
              >
                <HiOutlineChevronLeft className="h-5 w-5" />
              </button>

              {pageNumbers.map((pageNumber) => (
                <button
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                  className={
                    pagination.page === pageNumber
                      ? 'rounded-xl bg-[#00629d] px-4 py-2 text-sm font-semibold text-white'
                      : 'rounded-xl border border-[#d6e7f6] px-4 py-2 text-sm font-semibold text-[#4b6472]'
                  }
                >
                  {pageNumber}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={pagination.page === pagination.totalPages}
                className="rounded-xl border border-[#d6e7f6] px-4 py-2 text-sm font-semibold text-[#4b6472] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-[#0f1d25]/50"
            onClick={closeModal}
            aria-label="Close modal overlay"
          />
          <div className="relative z-10 w-full max-w-2xl rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-[#0f1d25]">
                  {editingLocation ? 'Cập nhật Đơn vị Hành chính' : 'Thêm Đơn vị Hành chính'}
                </h2>
              </div>
              <button
                type="button"
                className="rounded-full bg-[#f5faff] p-2 text-[#707882]"
                onClick={closeModal}
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-5 rounded-2xl border border-[#ffdad6] bg-[#fff8f7] px-4 py-3 text-sm text-[#ba1a1a]">
                {formError}
              </div>
            )}

            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Cấp quản lý</span>
                  <select
                    value={formState.level}
                    disabled={Boolean(editingLocation)}
                    onChange={(event) => {
                      const nextLevel = event.target.value as LocationLevel;
                      setFormState({
                        ...createDefaultForm(nextLevel),
                        name: formState.name,
                        code: formState.code,
                        isActive: formState.isActive,
                      });
                    }}
                    className={`w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none ${editingLocation ? 'cursor-not-allowed bg-[#f5faff] opacity-70' : 'bg-white'}`}
                  >
                    <option value="province">Tỉnh/Thành phố</option>
                    <option value="ward">Phường/Xã</option>
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Loại hành chính</span>
                  <select
                    value={formState.administrativeType}
                    onChange={(event) => setFormState((current) => ({ ...current, administrativeType: event.target.value }))}
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none"
                  >
                    {administrativeTypeOptions[formState.level].map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Tên đơn vị</span>
                  <input
                    value={formState.name}
                    onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                    placeholder={getLevelLabel(formState.level)}
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Mã hành chính</span>
                  <input
                    value={formState.code}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, code: event.target.value.replace(/\D/g, '') }))
                    }
                    placeholder="Ví dụ: 79, 760, 26734"
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none"
                  />
                </label>

                {formState.level !== 'province' && (
                  <label className="space-y-2 md:col-span-2">
                    <span className="text-sm font-semibold text-[#0f1d25]">Đơn vị cha</span>
                    {editingLocation ? (
                      <div className="rounded-2xl border border-[#d6e7f6] bg-[#f5faff] px-4 py-3 text-sm text-[#4b6472]">
                        {editingLocation.parentName ?? 'Đã gán trong hệ thống'}
                      </div>
                    ) : (
                      <select
                        value={formState.parentId}
                        onChange={(event) => setFormState((current) => ({ ...current, parentId: event.target.value }))}
                        className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none"
                      >
                        <option value="">Chọn đơn vị cha</option>
                        {availableParentOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                )}
              </div>

              <label className="flex items-center gap-3 rounded-2xl bg-[#f5faff] px-4 py-3 text-sm text-[#0f1d25]">
                <input
                  type="checkbox"
                  checked={formState.isActive}
                  onChange={(event) => setFormState((current) => ({ ...current, isActive: event.target.checked }))}
                />
                Kích hoạt sau khi lưu
              </label>

              <div className="flex flex-wrap justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl border border-[#d6e7f6] px-5 py-3 text-sm font-semibold text-[#4b6472]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-[#00629d] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? 'Đang lưu...' : editingLocation ? 'Lưu thay đổi' : 'Tạo địa giới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default LocationManagement;
