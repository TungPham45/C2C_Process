import { FC, FormEvent, useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';

/*                              CAU HINH API                              */

const ADMIN_API_BASE_URL = '/api/admin';
const MAX_ATTRIBUTES_PER_CATEGORY = 8;
/*                         KHAI BAO TYPE / INTERFACE                         */

//@GET
interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  level: number;
  sort_order: number;
  is_active: boolean;
  icon_url: string | null;
  //@GET children khong co san tu API; duoc buildTree gan vao de render cay danh muc.
  children?: Category[];
}
//@GOPT
interface Attribute {
  id: number;
  name: string;
  input_type: string;
  is_required: boolean;
  sort_order?: number;
  //@GOPT Danh sach tuy chon cua thuoc tinh duoc lay kem theo attribute tu API.
  options?: { id: number; value_name: string; sort_order?: number }[];
}
//@Create
interface CategoryFormState {
  name: string;
  slug: string;
  parent_id: string;
  sort_order: string;
  icon_url: string;
  is_active: boolean;
}
//@CATT
interface AttributeFormState {
  name: string;
  input_type: string;
  is_required: boolean;
  sort_order: string;
}
//@COPT
interface AttributeOptionDraft {
  id?: number;
  value_name: string;
  sort_order?: number;
}
//@DELETE
interface CategoryDeleteImpact {
  //@DELETE So san pham dang gan voi danh muc can xoa.
  productCount: number;
  //@DELETE So danh muc con; neu lon hon 0 thi khong cho xoa truc tiep.
  childrenCount: number;
  //@DELETE Danh muc "Khac" dung de chuyen san pham sang truoc khi xoa.
  fallbackCategory: { id: number; name: string } | null;
  //@DELETE Cho biet danh muc co the xoa ngay hay khong.
  canDelete: boolean;
  //@DELETE Cho biet co the chuyen san pham sang danh muc fallback roi xoa hay khong.
  canReassignToFallback: boolean;
}

interface CategoryDashboardStats {
  totalCategories?: number;
  activeCategories?: number;
  rootCategories?: number;
  maxAttributes?: number;
}

/*                          HELPER TAO FORM MAC DINH                          */

//@Create Tao form rong cho modal them danh muc moi; neu dang chon category thi category do duoc gan lam cha mac dinh.
const createDefaultCategoryForm = (selectedCategory: Category | null): CategoryFormState => ({
  name: '',
  slug: '',
  parent_id: selectedCategory ? String(selectedCategory.id) : '',
  sort_order: '',
  icon_url: '',
  is_active: true,
});

//@Put Dua du lieu danh muc dang sua vao form de admin chinh sua cac truong hien co.
const createCategoryFormFromCategory = (category: Category): CategoryFormState => ({
  name: category.name,
  slug: category.slug,
  parent_id: category.parent_id ? String(category.parent_id) : '',
  sort_order: String(category.sort_order ?? 0),
  icon_url: category.icon_url ?? '',
  is_active: category.is_active,
});

const ATTRIBUTE_INPUT_TYPE = 'dropdown';
const timeFormatter = new Intl.DateTimeFormat('vi-VN', {
  hour: '2-digit',
  minute: '2-digit',
});
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

//@CATT Tao form mac dinh cho modal them thuoc tinh moi.
const createDefaultAttributeForm = (): AttributeFormState => ({
  name: '',
  input_type: ATTRIBUTE_INPUT_TYPE,
  is_required: false,
  sort_order: '',
});

/*                        HELPER XU LY TUY CHON ATTRIBUTE                        */

const OPTION_INPUT_TYPES = new Set([ATTRIBUTE_INPUT_TYPE]);

//@CATT Chuan hoa input_type truoc khi tao attribute de tranh sai khac chu hoa/space.
const normalizeAttributeInputType = (inputType: string) => inputType.trim().toLowerCase();
const normalizeDuplicateKey = (value: string) => value.trim().replace(/\s+/g, ' ').normalize('NFC').toLowerCase();

const supportsAttributeOptions = (
  inputType: string,
  options?: { id: number; value_name: string; sort_order?: number }[] | AttributeOptionDraft[],
) => OPTION_INPUT_TYPES.has(normalizeAttributeInputType(inputType)) || Boolean(options?.length);

//@COPT Tao danh sach draft tuy chon ban dau khi form attribute can option.
//@POPT Khi sua attribute, ham nay copy cac option cu kem id vao form de co the PUT dung option.
const createAttributeOptionDrafts = (
  inputType: string,
  options?: { id: number; value_name: string; sort_order?: number }[],
): AttributeOptionDraft[] => {
  if (options && options.length > 0) {
    return options.map((option) => ({
      //@POPT Giu id cua option cu de submit biet day la option can cap nhat.
      id: option.id,
      value_name: option.value_name,
      sort_order: option.sort_order,
    }));
  }

  return supportsAttributeOptions(inputType, options) ? [{ value_name: '' }] : [];
};

/*                            COMPONENT CHINH                            */

const CategoryManagement: FC = () => {
  /*                       STATE / BIEN QUAN LY MAN HINH                       */

  //@GET Luu danh sach danh muc da duoc chuyen tu mang phang sang dang cay.
  const [categories, setCategories] = useState<Category[]>([]);
  //@GET Danh muc admin dang chon tren cay, dung de hien thi chi tiet va thuoc tinh ben phai.
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  //@GATT Luu danh sach thuoc tinh cua danh muc dang duoc chon.
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [stats, setStats] = useState<CategoryDashboardStats | null>(null);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null);
  //@GET Trang thai loading chinh cho lan tai du lieu cay danh muc va dashboard stats.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [categoryModalError, setCategoryModalError] = useState<string | null>(null);
  const [attributeModalError, setAttributeModalError] = useState<string | null>(null);
  //@GET Danh sach id cac node dang mo rong trong cay danh muc.
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  //@CATT Bat/tat modal them thuoc tinh cho danh muc dang chon.
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);
  //@DELETE Bat/tat modal xac nhan xoa danh muc.
  const [isDeleteCategoryModalOpen, setIsDeleteCategoryModalOpen] = useState(false);
  //@Create Khoa nut submit va ngan dong modal trong luc dang tao/cap nhat danh muc.
  const [submittingCategory, setSubmittingCategory] = useState(false);
  //@CATT Khoa nut submit trong luc dang tao thuoc tinh.
  const [submittingAttribute, setSubmittingAttribute] = useState(false);
  //@DELETE Khoa cac nut trong luc dang goi API xoa danh muc.
  const [deletingCategory, setDeletingCategory] = useState(false);
  //@DELETE Loading khi dang kiem tra danh muc co san pham/con truoc khi xoa.
  const [loadingDeleteImpact, setLoadingDeleteImpact] = useState(false);
  //@Create Du lieu form dung chung cho tao moi danh muc va chinh sua danh muc.
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(createDefaultCategoryForm(null));
  //@CATT Du lieu form tao thuoc tinh moi cho selectedCategory.
  const [attributeForm, setAttributeForm] = useState<AttributeFormState>(createDefaultAttributeForm());
  //@COPT Luu cac tuy chon dang nhap trong modal tao thuoc tinh.
  //@POPT Khi edit attribute, state nay chua ca option cu va id cua chung.
  const [attributeOptions, setAttributeOptions] = useState<AttributeOptionDraft[]>(
    createAttributeOptionDrafts(ATTRIBUTE_INPUT_TYPE),
  );
  //@Put Luu danh muc dang duoc sua; co gia tri thi form se submit PUT thay vi POST.
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  //@CATT Khi null thi modal attribute dang o che do tao moi.
  //@PATT Luu thuoc tinh dang duoc chinh sua; co gia tri thi submit se la PUT.
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  //@DELETE Danh muc dang duoc chon de xoa trong modal xac nhan.
  const [deleteTargetCategory, setDeleteTargetCategory] = useState<Category | null>(null);
  //@DELETE Ket qua kiem tra tac dong khi xoa danh muc.
  const [deleteImpact, setDeleteImpact] = useState<CategoryDeleteImpact | null>(null);
  //@DELETE Loi rieng cua flow xoa danh muc, hien truc tiep trong modal.
  const [deleteCategoryError, setDeleteCategoryError] = useState<string | null>(null);
  //@Create Duong dan cac cap cha admin chon trong form tao danh muc moi.
  const [parentSelectionPath, setParentSelectionPath] = useState<number[]>([]);

  /*                              LIFECYCLE / EFFECT                              */

  //@GET Tai cay danh muc ngay khi man hinh Category Management duoc mount.
  useEffect(() => {
    fetchData();
  }, []);

  /*                                  HELPER LAY / DUNG CAY DANH MUC                                  */

  //@GET Trai phang cay danh muc thanh mot mang de tim kiem nhanh theo id khi can xu ly cha/con.
  const flattenedCategories = useMemo(() => {
    const flattened: Category[] = [];

    //@GET Duyet de quy tung node con va dua tat ca node vao cung mot mang.
    const walk = (nodes: Category[]) => {
      nodes.forEach((node) => {
        flattened.push(node);
        if (node.children?.length) {
          walk(node.children);
        }
      });
    };

    walk(categories);
    return flattened;
  }, [categories]);

  //@GET Map id -> category giup lay thong tin danh muc nhanh, khong phai duyet cay moi lan.
  const categoryLookup = useMemo(
    () => new Map(flattenedCategories.map((category) => [category.id, category])),
    [flattenedCategories],
  );

  /*                               API GET DU LIEU                               */

  //@GET Goi API lay danh muc va thong ke; danh muc tra ve dang phang nen can buildTree truoc khi render.
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [catRes, statsRes] = await Promise.all([
        fetch(`${ADMIN_API_BASE_URL}/categories`),
        fetch(`${ADMIN_API_BASE_URL}/dashboard`)
      ]);
      if (!catRes.ok) throw new Error(await getResponseError(catRes, 'Failed to fetch categories'));
      if (!statsRes.ok) throw new Error(await getResponseError(statsRes, 'Failed to fetch admin dashboard'));
      const catData = await catRes.json();
      const statsData = await statsRes.json();

      //@GET API tra ve list danh muc phang; UI can dang cay nen chuyen doi tai day.
      setCategories(buildTree(catData));
      setStats(statsData);
      setStatsUpdatedAt(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch category data');
    } finally {
      setLoading(false);
    }
  };

  //@GET Chuyen mang danh muc phang co parent_id thanh cau truc cay children[].
  const buildTree = (flat: Category[]) => {
    const tree: Category[] = [];
    const map = new Map<number, Category>();

    //@GET Tao ban sao moi cho tung category va khoi tao children de gan node con ve sau.
    flat.forEach(cat => {
      map.set(cat.id, { ...cat, children: [] });
    });

    //@GET Gan tung node vao parent neu co parent_id, neu khong thi day len root tree.
    flat.forEach(cat => {
      const node = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children!.push(node);
      } else {
        tree.push(node);
      }
    });

    return tree;
  };

  //@GATT Goi API lay bo thuoc tinh cua mot danh muc theo category id.
  const loadAttributes = async (catId: number) => {
    try {
      setError(null);
      //@GATT Endpoint tra ve cac attribute dang gan voi danh muc duoc chon.
      const res = await fetch(`${ADMIN_API_BASE_URL}/categories/${catId}/attributes`);
      if (!res.ok) throw new Error(await getResponseError(res, 'Failed to fetch category attributes'));
      const data = await res.json();
      //@GATT Cap nhat danh sach attribute de panel ben phai render lai.
      //@GOPT Moi attribute trong data co the kem options de hien thi cac tuy chon san co.
      setAttributes(data);
    } catch (error) {
      console.error('Error loading attributes:', error);
      //@GATT Neu lay attribute loi thi clear danh sach cu de tranh hien sai category.
      setAttributes([]);
      setError(error instanceof Error ? error.message : 'Failed to load category attributes');
    }
  };

  /*                            HAM CHON / MO RONG CAY                            */

  const toggleExpand = (id: number) => {
    //@GET Bat/tat trang thai mo rong cua mot node tren cay danh muc.
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectCategory = (cat: Category) => {
    //@GET Khi chon node, luu danh muc dang chon va tai bo thuoc tinh cua danh muc do.
    setSelectedCategory(cat);
    //@GATT Moi lan chon category tren cay thi lay lai attributes cua category do.
    loadAttributes(cat.id);
  };

  /*                          HELPER CHON DANH MUC CHA                          */

  //@Create Tao path tu root den category cha de hien thi san chuoi cha trong form tao danh muc.
  const buildParentSelectionPath = (categoryId: number | null) => {
    if (!categoryId) return [];

    const path: number[] = [];
    let currentId: number | null = categoryId;

    while (currentId) {
      const currentCategory = categoryLookup.get(currentId);
      if (!currentCategory) break;

      path.unshift(currentCategory.id);
      currentId = currentCategory.parent_id;
    }

    return path;
  };

  //@Create Cap nhat parent_id khi admin chon danh muc cha theo tung cap trong form tao moi.
  const handleParentLevelChange = (levelIndex: number, value: string) => {
    const nextPath = parentSelectionPath.slice(0, levelIndex);

    if (value) {
      nextPath.push(Number(value));
    }

    setParentSelectionPath(nextPath);
    setCategoryForm((prev) => ({
      ...prev,
      parent_id: nextPath.length > 0 ? String(nextPath[nextPath.length - 1]) : '',
    }));
  };

  //@Create Tao danh sach option cho tung cap cha dua tren cay danh muc hien tai.
  const parentSelectionLevels = useMemo(() => {
    const levels: Category[][] = [];
    let currentLevelCategories = categories;
    let depth = 0;

    while (currentLevelCategories.length > 0) {
      levels.push(currentLevelCategories);

      const selectedId = parentSelectionPath[depth];
      if (!selectedId) break;

      const selectedCategoryAtLevel = currentLevelCategories.find((category) => category.id === selectedId);
      if (!selectedCategoryAtLevel?.children?.length) break;

      currentLevelCategories = selectedCategoryAtLevel.children;
      depth += 1;
    }

    return levels;
  }, [categories, parentSelectionPath]);

  //@Create Lay thong tin cac danh muc cha da chon de hien thi breadcrumb trong form.
  const selectedParentCategories = parentSelectionPath
    .map((categoryId) => categoryLookup.get(categoryId))
    .filter((category): category is Category => Boolean(category));

  /*                             MODAL / FORM DANH MUC                             */

  //@Create Mo modal tao danh muc moi va mac dinh parent la danh muc dang duoc chon tren cay.
  const openCategoryModal = () => {
    setError(null);
    setSuccessMessage(null);
    setCategoryModalError(null);
    setEditingCategory(null);
    setCategoryForm(createDefaultCategoryForm(selectedCategory));
    setParentSelectionPath(buildParentSelectionPath(selectedCategory?.id ?? null));
    setIsCategoryModalOpen(true);
  };

  //@Put Mo modal sua danh muc va nap du lieu category hien tai vao form.
  const openEditCategoryModal = (category: Category) => {
    setError(null);
    setSuccessMessage(null);
    setCategoryModalError(null);
    //@Put Dat editingCategory de modal biet dang o che do chinh sua.
    setEditingCategory(category);
    //@Put Copy name, slug, sort_order, icon_url va is_active hien tai vao categoryForm.
    setCategoryForm(createCategoryFormFromCategory(category));
    //@Put Lay path cua danh muc cha hien tai de hien thi breadcrumb parent trong modal edit.
    setParentSelectionPath(buildParentSelectionPath(category.parent_id));
    setIsCategoryModalOpen(true);
  };

  //@Put Dong modal sua danh muc va xoa editingCategory de thoat che do PUT.
  const closeCategoryModal = () => {
    if (submittingCategory) return;
    setIsCategoryModalOpen(false);
    setCategoryModalError(null);
    setEditingCategory(null);
    setCategoryForm(createDefaultCategoryForm(selectedCategory));
    setParentSelectionPath(buildParentSelectionPath(selectedCategory?.id ?? null));
  };

  /*                            MODAL XOA DANH MUC                            */

  //@DELETE Mo modal xoa va goi API delete-impact de biet co the xoa truc tiep hay can chan/chuyen san pham.
  const openDeleteCategoryModal = async (category: Category) => {
    setError(null);
    setSuccessMessage(null);
    //@DELETE Luu danh muc can xoa de cac nut trong modal biet dang thao tac voi category nao.
    setDeleteTargetCategory(category);
    setDeleteImpact(null);
    setDeleteCategoryError(null);
    setIsDeleteCategoryModalOpen(true);
    setLoadingDeleteImpact(true);

    try {
      //@DELETE Kiem tra truoc khi xoa: san pham, danh muc con va danh muc fallback "Khac".
      const response = await fetch(`${ADMIN_API_BASE_URL}/categories/${category.id}/delete-impact`);

      if (!response.ok) {
        throw new Error(await getResponseError(response, 'Failed to check category delete impact'));
      }

      //@DELETE Luu ket qua impact de modal quyet dinh hien nut xoa hay nut chuyen sang "Khac" va xoa.
      setDeleteImpact(await response.json());
    } catch (deleteImpactError) {
      console.error('Error checking category delete impact:', deleteImpactError);
      setDeleteCategoryError(
        deleteImpactError instanceof Error
          ? deleteImpactError.message
          : 'Failed to check category delete impact',
      );
    } finally {
      setLoadingDeleteImpact(false);
    }
  };

  //@DELETE Dong modal xoa va reset thong tin impact/error neu khong dang goi API xoa.
  const closeDeleteCategoryModal = () => {
    if (deletingCategory) return;
    setIsDeleteCategoryModalOpen(false);
    setDeleteTargetCategory(null);
    setDeleteImpact(null);
    setDeleteCategoryError(null);
  };

  /*                          MODAL / FORM THUOC TINH                          */

  //@CATT Mo modal tao thuoc tinh moi cho danh muc dang duoc chon.
  const openAttributeModal = () => {
    if (!selectedCategory) return;
    if (attributes.length >= MAX_ATTRIBUTES_PER_CATEGORY) {
      setAttributeModalError(`A category can have at most ${MAX_ATTRIBUTES_PER_CATEGORY} attributes.`);
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setAttributeModalError(null);
    //@CATT Reset editingAttribute ve null de submit theo nhanh POST tao moi.
    setEditingAttribute(null);
    //@CATT Reset form ve gia tri mac dinh khi bat dau tao thuoc tinh.
    setAttributeForm(createDefaultAttributeForm());
    //@COPT Khoi tao danh sach tuy chon mac dinh khi mo modal tao thuoc tinh.
    setAttributeOptions(createAttributeOptionDrafts(ATTRIBUTE_INPUT_TYPE));
    setIsAttributeModalOpen(true);
  };

  //@PATT Mo modal chinh sua thuoc tinh va nap du lieu attribute hien tai vao form.
  const openEditAttributeModal = (attribute: Attribute) => {
    setError(null);
    setSuccessMessage(null);
    setAttributeModalError(null);
    //@PATT Dat editingAttribute de form biet dang o che do edit.
    setEditingAttribute(attribute);
    //@PATT Copy name, input_type, required va sort_order hien tai vao attributeForm.
    setAttributeForm({
      name: attribute.name,
      input_type: ATTRIBUTE_INPUT_TYPE,
      is_required: attribute.is_required,
      sort_order: attribute.sort_order !== undefined ? String(attribute.sort_order) : '',
    });
    //@POPT Nap cac tuy chon hien co cua attribute vao form de admin sua value_name.
    setAttributeOptions(createAttributeOptionDrafts(ATTRIBUTE_INPUT_TYPE, attribute.options));
    setIsAttributeModalOpen(true);
  };

  //@PATT Dong modal edit attribute va xoa editingAttribute de thoat che do PUT.
  const closeAttributeModal = () => {
    if (submittingAttribute) return;
    setIsAttributeModalOpen(false);
    setAttributeModalError(null);
    setEditingAttribute(null);
    setAttributeForm(createDefaultAttributeForm());
    setAttributeOptions(createAttributeOptionDrafts(ATTRIBUTE_INPUT_TYPE));
  };

  //@COPT Cap nhat gia tri cua mot tuy chon trong form tao thuoc tinh.
  //@POPT Khi option co id, thay doi nay se duoc submit bang PUT cho option do.
  const handleAttributeOptionChange = (index: number, value: string) => {
    setAttributeModalError(null);
    setAttributeOptions((prev) =>
      prev.map((option, optionIndex) =>
        optionIndex === index ? { ...option, value_name: value } : option,
      ),
    );
  };

  //@COPT Them mot dong tuy chon moi vao form attribute.
  const handleAddAttributeOptionField = () => {
    setAttributeOptions((prev) => [...prev, { value_name: '' }]);
  };

  //@COPT Xoa mot dong tuy chon trong form attribute.
  //@DOPT Khi dong option cu co id bi xoa khoi form, submit edit se goi DELETE cho option do.
  const handleRemoveAttributeOptionField = (index: number) => {
    setAttributeOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index));
  };

  /*                             SUBMIT DANH MUC                             */

  //@Create Xu ly submit form tao danh muc moi; ham nay dung chung voi edit nen co nhanh POST/PUT.
  //@Put Khi editingCategory co gia tri, ham nay se cap nhat danh muc bang PUT /categories/:id.
  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    //@Create Ten danh muc la truong bat buoc truoc khi goi API tao moi.
    const trimmedName = categoryForm.name.trim();
    if (!trimmedName) {
      setCategoryModalError('Category name is required.');
      return;
    }

    //@Put isEditingCategory phan biet submit dang sua danh muc hay tao danh muc moi.
    const isEditingCategory = Boolean(editingCategory);
    //@Create Khi tao moi, parentId lay tu select danh muc cha; neu khong chon thi tao danh muc root.
    //@Put Khi sua, parentId giu nguyen theo editingCategory vi UI khong cho doi danh muc cha.
    const parentId = isEditingCategory
      ? editingCategory?.parent_id ?? null
      : categoryForm.parent_id
        ? Number(categoryForm.parent_id)
        : null;
    //@Create Tim parentCategory de tinh level cho danh muc moi.
    const parentCategory = parentId
      ? flattenedCategories.find((category) => category.id === parentId) ?? null
      : null;

    try {
      setSubmittingCategory(true);
      setError(null);
      setCategoryModalError(null);
      setSuccessMessage(null);

      //@Create Neu khong phai edit thi goi POST /categories de tao danh muc moi.
      //@Put Neu dang edit thi goi PUT /categories/:id de cap nhat danh muc hien tai.
      const response = await fetch(isEditingCategory ? `${ADMIN_API_BASE_URL}/categories/${editingCategory!.id}` : `${ADMIN_API_BASE_URL}/categories`, {
        method: isEditingCategory ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          //@Create Payload tao moi gom ten, slug, parent, thu tu, icon, active va level.
          //@Put Payload update gom cac truong duoc phep sua; parent va level duoc giu nguyen.
          name: trimmedName,
          slug: categoryForm.slug.trim() || undefined,
          parent_id: parentId,
          sort_order: categoryForm.sort_order ? Number(categoryForm.sort_order) : 0,
          icon_url: categoryForm.icon_url.trim() || null,
          is_active: categoryForm.is_active,
          //@Put Khi sua danh muc, level giu nguyen de khong lam lech cau truc cay.
          level: isEditingCategory ? editingCategory!.level : parentCategory ? parentCategory.level + 1 : 1,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getResponseError(response, isEditingCategory ? 'Failed to update category' : 'Failed to create category'),
        );
      }

      const savedCategory = await response.json();

      //@Create Sau khi tao thanh cong, tai lai cay danh muc de node moi xuat hien tren UI.
      //@Put Sau khi sua thanh cong, tai lai cay danh muc de ten/trang thai/thu tu moi hien thi.
      await fetchData();
      setSelectedCategory(savedCategory);
      //@GATT Lay attributes cua category vua tao/sua de panel ben phai dong bo voi selectedCategory.
      await loadAttributes(savedCategory.id);
      //@Create Neu tao danh muc con, tu dong mo node cha de admin thay danh muc vua tao.
      if (!isEditingCategory && parentId) {
        setExpandedIds((prev) => (prev.includes(parentId) ? prev : [...prev, parentId]));
      }
      setSuccessMessage(
        isEditingCategory
          ? `Updated category "${savedCategory.name}".`
          : `Created category "${savedCategory.name}".`,
      );
      setIsCategoryModalOpen(false);
      //@Put Xoa editingCategory de modal lan sau quay ve che do tao moi neu bam nut them.
      setEditingCategory(null);
      //@Create Reset form dua tren danh muc vua tao de lan mo tiep theo co parent mac dinh phu hop.
      setCategoryForm(createDefaultCategoryForm(savedCategory));
      setParentSelectionPath(buildParentSelectionPath(savedCategory.id));
    } catch (submitError) {
      console.error('Error saving category:', submitError);
      setCategoryModalError(
        submitError instanceof Error
          ? submitError.message
          : isEditingCategory
            ? 'Failed to update category'
            : 'Failed to create category',
      );
    } finally {
      setSubmittingCategory(false);
    }
  };

  /*                               XOA DANH MUC                               */

  //@DELETE Goi API DELETE de xoa danh muc; co the kem option chuyen san pham sang "Khac".
  const handleDeleteCategory = async (reassignProductsToOther = false) => {
    if (!deleteTargetCategory) return;

    try {
      setDeletingCategory(true);
      setDeleteCategoryError(null);
      setError(null);
      setSuccessMessage(null);

      //@DELETE DELETE /categories/:id; body reassignProductsToOther=true neu can chuyen san pham sang danh muc "Khac".
      const response = await fetch(`${ADMIN_API_BASE_URL}/categories/${deleteTargetCategory.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reassignProductsToOther }),
      });

      if (!response.ok) {
        throw new Error(await getResponseError(response, 'Failed to delete category'));
      }

      //@DELETE Sau khi xoa thanh cong, tai lai cay danh muc de bo node vua xoa khoi UI.
      await fetchData();

      //@DELETE Neu dang xem dung danh muc vua xoa thi clear panel chi tiet va attribute.
      if (selectedCategory?.id === deleteTargetCategory.id) {
        setSelectedCategory(null);
        //@GATT Clear attributes khi category dang xem da bi xoa.
        setAttributes([]);
      }

      //@DELETE Hien thong bao khac nhau giua xoa truc tiep va chuyen san pham sang "Khac" roi xoa.
      setSuccessMessage(
        reassignProductsToOther
          ? `Đã chuyển sản phẩm sang "Khác" và xóa danh mục "${deleteTargetCategory.name}".`
          : `Đã xóa danh mục "${deleteTargetCategory.name}".`,
      );
      setIsDeleteCategoryModalOpen(false);
      //@DELETE Reset target va impact sau khi thao tac xoa hoan tat.
      setDeleteTargetCategory(null);
      setDeleteImpact(null);
    } catch (deleteError) {
      console.error('Error deleting category:', deleteError);
      setDeleteCategoryError(deleteError instanceof Error ? deleteError.message : 'Failed to delete category');
    } finally {
      setDeletingCategory(false);
    }
  };

  /*                       SUBMIT THUOC TINH / TUY CHON                       */

  //@CATT Xu ly submit form tao thuoc tinh moi cho selectedCategory; ham nay dung chung voi edit.
  //@PATT Khi editingAttribute co gia tri, ham nay cap nhat thuoc tinh bang PUT /attributes/:id.
  const handleAttributeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    //@CATT Phai chon danh muc truoc khi tao thuoc tinh.
    if (!selectedCategory) {
      setAttributeModalError('Select a category before adding an attribute.');
      return;
    }

    //@CATT Ten thuoc tinh la bat buoc truoc khi goi API tao moi.
    const trimmedName = attributeForm.name.trim();
    if (!trimmedName) {
      setAttributeModalError('Attribute name is required.');
      return;
    }

    if (!editingAttribute && attributes.length >= MAX_ATTRIBUTES_PER_CATEGORY) {
      setAttributeModalError(`A category can have at most ${MAX_ATTRIBUTES_PER_CATEGORY} attributes.`);
      return;
    }

    //@CATT Chuan hoa input_type truoc khi submit.
    const normalizedInputType = normalizeAttributeInputType(attributeForm.input_type);
    //@COPT Chuan hoa danh sach tuy chon: trim value va bo cac dong rong.
    const normalizedOptions = supportsAttributeOptions(normalizedInputType, attributeOptions)
      ? attributeOptions
        .map((option, index) => ({
          //@POPT Giu id neu day la tuy chon cu dang duoc sua.
          id: option.id,
          value_name: option.value_name.trim(),
          sort_order: index,
        }))
        .filter((option) => option.value_name.length > 0)
      : [];

    //@COPT Neu input_type can tuy chon thi phai co it nhat mot gia tri hop le.
    if (supportsAttributeOptions(normalizedInputType, attributeOptions) && normalizedOptions.length === 0) {
      setAttributeModalError('At least one option is required for this input type.');
      return;
    }

    const seenOptionNames = new Set<string>();
    const hasDuplicateOptionName = normalizedOptions.some((option) => {
      const key = normalizeDuplicateKey(option.value_name);
      if (seenOptionNames.has(key)) {
        return true;
      }

      seenOptionNames.add(key);
      return false;
    });

    if (hasDuplicateOptionName) {
      setAttributeModalError('Attribute option name already exists.');
      return;
    }

    try {
      setSubmittingAttribute(true);
      setError(null);
      setAttributeModalError(null);
      setSuccessMessage(null);

      //@CATT Payload tao thuoc tinh gom name, input_type, required va sort_order.
      //@PATT Payload update gom cac truong co the chinh sua cua thuoc tinh.
      const payload = {
        name: trimmedName,
        input_type: normalizedInputType,
        is_required: attributeForm.is_required,
        sort_order: attributeForm.sort_order ? Number(attributeForm.sort_order) : 0,
      };

      //@CATT Khi tao moi, goi POST /categories/:id/attributes de gan attribute vao danh muc dang chon.
      //@PATT Khi edit, goi PUT /attributes/:id de cap nhat thuoc tinh hien tai.
      const attributeResponse = await fetch(
        editingAttribute
          ? `${ADMIN_API_BASE_URL}/attributes/${editingAttribute.id}`
          : `${ADMIN_API_BASE_URL}/categories/${selectedCategory.id}/attributes`,
        {
          method: editingAttribute ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );

      if (!attributeResponse.ok) {
        throw new Error(
          await getResponseError(
            attributeResponse,
            editingAttribute ? 'Failed to update attribute' : 'Failed to create attribute',
          ),
        );
      }

      const savedAttribute = await attributeResponse.json();

      //@POPT Danh sach option cu cua attribute dang sua, dung de so sanh voi form hien tai.
      //@DOPT Danh sach option cu nay duoc dung de tim option nao da bi xoa khoi form.
      const existingOptions = editingAttribute?.options ?? [];
      //@POPT Cac option id con duoc giu lai sau khi admin sua form.
      //@DOPT Option id nao khong con trong keptOptionIds se bi xoa bang DELETE.
      const keptOptionIds = new Set(
        normalizedOptions
          .map((option) => option.id)
          .filter((optionId): optionId is number => optionId !== undefined),
      );

      await Promise.all(
        existingOptions
          //@DOPT Loc ra cac option cu da bi admin xoa khoi form trong luc sua attribute.
          .filter((option) => !keptOptionIds.has(option.id))
          .map(async (option) => {
            //@DOPT Goi DELETE /attribute-options/:id cho tung option cu khong con duoc giu lai.
            const deleteResponse = await fetch(`${ADMIN_API_BASE_URL}/attribute-options/${option.id}`, {
              method: 'DELETE',
            });

            if (!deleteResponse.ok) {
              //@DOPT Neu xoa option that bai thi dung submit va hien loi.
              throw new Error(await getResponseError(deleteResponse, 'Failed to delete attribute option'));
            }
          }),
      );

      await Promise.all(
        normalizedOptions.map(async (option) => {
          //@COPT Khi option chua co id, goi POST /attributes/:id/options de tao tuy chon moi.
          //@POPT Khi option co id, goi PUT /attribute-options/:id de cap nhat tuy chon cu.
          const optionResponse = await fetch(
            option.id
              ? `${ADMIN_API_BASE_URL}/attribute-options/${option.id}`
              : `${ADMIN_API_BASE_URL}/attributes/${savedAttribute.id}/options`,
            {
              method: option.id ? 'PUT' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                //@POPT value_name va sort_order moi cua tuy chon dang sua.
                value_name: option.value_name,
                sort_order: option.sort_order,
              }),
            },
          );

          if (!optionResponse.ok) {
            throw new Error(
              await getResponseError(
                optionResponse,
                option.id ? 'Failed to update attribute option' : 'Failed to create attribute option',
              ),
            );
          }
        }),
      );

      //@GATT Lay lai attributes sau khi them/sua attribute de danh sach ben phai cap nhat moi nhat.
      await loadAttributes(selectedCategory.id);
      await fetchData();
      setSuccessMessage(
        editingAttribute
          ? `Updated attribute "${savedAttribute.name}".`
          : `Added attribute "${savedAttribute.name}" to "${selectedCategory.name}".`,
      );
      setIsAttributeModalOpen(false);
      //@PATT Xoa editingAttribute de lan mo sau khong con o che do edit.
      setEditingAttribute(null);
      //@CATT Reset form sau khi tao thuoc tinh thanh cong.
      setAttributeForm(createDefaultAttributeForm());
      setAttributeOptions(createAttributeOptionDrafts(ATTRIBUTE_INPUT_TYPE));
    } catch (submitError) {
      console.error('Error creating attribute:', submitError);
      setAttributeModalError(
        submitError instanceof Error
          ? submitError.message
          : editingAttribute
            ? 'Failed to update attribute'
            : 'Failed to create attribute',
      );
    } finally {
      setSubmittingAttribute(false);
    }
  };

  /*                              XOA THUOC TINH                              */

  //@DATT Xu ly xoa mot thuoc tinh cua danh muc dang chon.
  const handleDeleteAttribute = async (attribute: Attribute) => {
    //@DATT Phai co selectedCategory thi moi biet can reload attributes cua danh muc nao sau khi xoa.
    if (!selectedCategory) return;
    //@DATT Xac nhan truoc khi xoa vi thao tac nay goi DELETE truc tiep.
    if (!window.confirm(`Delete attribute "${attribute.name}"?`)) return;

    try {
      setError(null);
      setSuccessMessage(null);

      //@DATT Goi DELETE /attributes/:id de xoa thuoc tinh hien tai.
      //@DOPT Khi xoa ca attribute, cac tuy chon cua attribute do se khong con duoc hien thi sau khi reload.
      const response = await fetch(`${ADMIN_API_BASE_URL}/attributes/${attribute.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(await getResponseError(response, 'Failed to delete attribute'));
      }

      //@GATT Lay lai attributes sau khi xoa attribute de danh sach khong con item vua xoa.
      //@DATT Reload danh sach thuoc tinh sau khi xoa thanh cong.
      //@DOPT Reload attributes de loai bo attribute vua xoa va toan bo options di kem khoi UI.
      await loadAttributes(selectedCategory.id);
      await fetchData();
      //@DATT Hien thong bao xoa thuoc tinh thanh cong.
      setSuccessMessage(`Deleted attribute "${attribute.name}".`);
    } catch (deleteError) {
      console.error('Error deleting attribute:', deleteError);
      //@DATT Hien loi neu API xoa thuoc tinh that bai.
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete attribute');
    }
  };

  /*                            RENDER HELPER CAY DANH MUC                            */

  //@GET Render de quy tung node cua cay danh muc, bao gom nut mo rong va cac node con.
  const renderCategoryNode = (node: Category) => {
    //@GET isExpanded quyet dinh co hien thi children cua node hien tai hay khong.
    const isExpanded = expandedIds.includes(node.id);
    //@GET hasChildren quyet dinh co hien icon expand/collapse o dau dong hay khong.
    const hasChildren = node.children && node.children.length > 0;
    //@GET isSelected dung de doi mau node dang duoc admin chon.
    const isSelected = selectedCategory?.id === node.id;
    //@GET isActive dung de hien badge trang thai va lam mo/gach ngang danh muc khong hoat dong.
    const isActive = Boolean(node.is_active);

    return (
      <div key={node.id} className="ml-4">
        <div
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${isSelected
            ? 'bg-[#00629d] text-white'
            : isActive
              ? 'hover:bg-[#e9f5ff]'
              : 'bg-[#fff8f7] text-[#7d2924] opacity-80 hover:bg-[#fff0ef]'
            }`}
          onClick={() => handleSelectCategory(node)}
        >
          {hasChildren ? (
            <span
              className="material-symbols-outlined text-sm select-none"
              onClick={(e) => {
                //@GET Ngan click vao icon expand dong thoi kich hoat chon category.
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isExpanded ? 'expand_more' : 'chevron_right'}
            </span>
          ) : (
            <span className="w-4"></span>
          )}
          <span className="material-symbols-outlined text-sm">
            {isSelected ? 'folder_open' : 'folder'}
          </span>
          <span className={`min-w-0 flex-1 truncate text-sm font-medium ${!isActive && !isSelected ? 'line-through decoration-[#ba1a1a]/50' : ''}`}>
            {node.name}
          </span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${isSelected
              ? isActive
                ? 'bg-white/20 text-white'
                : 'bg-[#ffe5e1] text-[#7d2924]'
              : isActive
                ? 'bg-[#e6f6ec] text-[#23713a]'
                : 'bg-[#ffdad6] text-[#ba1a1a]'
              }`}
          >
            {isActive ? 'Hoạt động' : 'Không hoạt động'}
          </span>
        </div>
        {isExpanded && hasChildren && (
          <div className="border-l border-[#e1f0fb] ml-2">
            {/* //@GET De quy render cac danh muc con khi node cha dang mo rong. */}
            {node.children!.map(child => renderCategoryNode(child))}
          </div>
        )}
      </div>
    );
  };

  //@PATT Boolean dung de doi title, message va nut submit cua modal attribute sang che do edit.
  const isEditingAttribute = Boolean(editingAttribute);
  const showOptionSection = supportsAttributeOptions(attributeForm.input_type, attributeOptions);
  const hasReachedAttributeLimit = Boolean(selectedCategory) && attributes.length >= MAX_ATTRIBUTES_PER_CATEGORY;
  const categoryStatCards = useMemo(() => {
    const totalCategories = stats?.totalCategories ?? 0;
    const activeCategories = stats?.activeCategories ?? 0;
    const rootCategories = stats?.rootCategories ?? 0;
    const childCategories = Math.max(totalCategories - rootCategories, 0);
    const maxAttributes = stats?.maxAttributes ?? MAX_ATTRIBUTES_PER_CATEGORY;

    return [
      {
        label: 'Tổng danh mục',
        value: totalCategories,
        icon: 'category',
        sub: `${activeCategories} đang hoạt động`,
        color: 'bg-blue-500',
      },
      {
        label: 'Danh mục chính',
        value: rootCategories,
        icon: 'account_tree',
        sub: `${childCategories} danh mục con`,
        color: 'bg-indigo-500',
      },
      {
        label: 'Thuộc tính tối đa',
        value: maxAttributes,
        icon: 'rule',
        sub: 'Trong một danh mục',
        color: 'bg-purple-500',
      },
      {
        label: 'Cập nhật cuối',
        value: statsUpdatedAt ? timeFormatter.format(statsUpdatedAt) : '--:--',
        icon: 'update',
        sub: statsUpdatedAt ? dateFormatter.format(statsUpdatedAt) : 'Chưa tải dữ liệu',
        color: 'bg-emerald-500',
      },
    ];
  }, [stats, statsUpdatedAt]);

  /*                               HTML CHINH                               */

  return (
    <AdminLayout pageTitle="Quản lý Danh mục">
      <div className="max-w-[1400px] mx-auto">
        {/*                            HTML: THONG BAO                            */}

        {successMessage && (
          <div className="mb-6 rounded-2xl border border-[#cde7d3] bg-[#f4fff6] px-4 py-3 text-sm text-[#245b31]">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-[#ffdad6] bg-[#fff8f7] px-4 py-3 text-sm text-[#ba1a1a]">
            {error}
          </div>
        )}

        {/*                            HTML: THONG KE DAU TRANG                            */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {categoryStatCards.map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[24px] border border-[#e1f0fb] shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.color} bg-opacity-10 flex items-center justify-center`}>
                <span className={`material-symbols-outlined ${stat.color.replace('bg-', 'text-')}`}>
                  {stat.icon}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#707882] uppercase tracking-wider">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold text-[#0f1d25]">{stat.value}</h3>
                  <span className="text-[10px] text-[#707882]">{stat.sub}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/*                            HTML: NOI DUNG CHINH                            */}

        <div className="flex gap-8 h-[calc(100vh-320px)]">
          {/*                            HTML: PANEL CAY DANH MUC                            */}

          {/* //@GET Left Panel: hien thi cay danh muc duoc tao tu fetchData + buildTree. */}
          <div className="w-[400px] bg-white rounded-[32px] border border-[#e1f0fb] shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#e1f0fb] flex items-center justify-between">
              <h4 className="font-bold text-[#0f1d25]">Cấu trúc cây</h4>
              <button type="button" className="text-[#00629d] text-xs font-bold hover:underline" onClick={() => setExpandedIds([])}>
                Thu gọn tất cả
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {loading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-[#f5faff] rounded-xl"></div>)}
                </div>
              ) : (
                categories.map(cat => renderCategoryNode(cat))
              )}
            </div>
            <div className="p-4 bg-[#f5faff]">
              {/* //@Create Nut mo modal them danh muc moi. */}
              <button type="button" className="w-full py-3 bg-[#00629d] text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-[#00629d20] hover:bg-[#005183] transition-all" onClick={openCategoryModal}>
                <span className="material-symbols-outlined">add_circle</span>
                Thêm danh mục mới
              </button>
            </div>
          </div>

          {/*                            HTML: PANEL THUOC TINH                            */}

          {/* //@GATT Right Panel hien thi bo thuoc tinh lay theo danh muc dang chon. */}
          <div className="flex-1 bg-white rounded-[32px] border border-[#e1f0fb] shadow-sm flex flex-col overflow-hidden">
            <div className="p-6 border-b border-[#e1f0fb] flex items-center justify-between bg-gradient-to-r from-white to-[#f5faff]">
              <div className="flex items-center gap-3">
                {/* //@GATT Tieu de khu vuc danh sach thuoc tinh cua category. */}
                <h4 className="font-bold text-[#0f1d25]">Bộ thuộc tính (Attribute Rules)</h4>
                {selectedCategory && (
                  /* //@GATT Hien ten category dang duoc dung de lay attributes. */
                  <span className="px-3 py-1 bg-[#00629d] bg-opacity-10 text-[#00629d] text-[10px] font-bold rounded-full uppercase tracking-widest">
                    {selectedCategory.name}
                  </span>
                )}
                {selectedCategory && (
                  <span className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest ${hasReachedAttributeLimit ? 'bg-[#fff0ef] text-[#ba1a1a]' : 'bg-[#e9f5ff] text-[#00629d]'}`}>
                    {attributes.length}/{MAX_ATTRIBUTES_PER_CATEGORY} attributes
                  </span>
                )}
              </div>
              <button type="button" className="flex items-center gap-2 text-[#00629d] text-sm font-bold bg-[#e9f5ff] px-4 py-2 rounded-xl hover:bg-[#d0e9ff] transition-all disabled:cursor-not-allowed disabled:opacity-50" onClick={openAttributeModal} disabled={!selectedCategory || hasReachedAttributeLimit}>
                <span className="material-symbols-outlined text-sm">add</span> Thêm quy tắc
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              {!selectedCategory ? (
                /* //@GATT Trang thai rong khi chua chon category nen chua co attributes de lay. */
                <div className="h-full flex flex-col items-center justify-center text-[#707882]">
                  <span className="material-symbols-outlined text-6xl opacity-20 mb-4">account_tree</span>
                  <p className="font-medium">Chọn một danh mục để xem thuộc tính</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {hasReachedAttributeLimit && (
                    <div className="rounded-2xl border border-[#ffd9d6] bg-[#fff8f7] px-4 py-3 text-sm font-semibold text-[#ba1a1a]">
                      Danh mục này đã đạt giới hạn {MAX_ATTRIBUTES_PER_CATEGORY} thuộc tính.
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-2xl border border-[#e1f0fb] bg-[#f8fbff] px-4 py-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#707882]">Danh mục được chọn</p>
                      <p className="mt-1 text-sm font-bold text-[#0f1d25]">{selectedCategory.name}</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {/* //@Put Nut mo modal chinh sua danh muc dang duoc chon. */}
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-xl border border-[#d6e7f6] bg-white px-4 py-2 text-sm font-semibold text-[#00629d] transition-all hover:bg-[#f5faff]"
                        onClick={() => openEditCategoryModal(selectedCategory)}
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Chỉnh sửa danh mục
                      </button>
                      {/* //@DELETE Nut mo modal xoa danh muc dang duoc chon. */}
                      <button
                        type="button"
                        className="flex items-center gap-2 rounded-xl border border-[#ffd9d6] bg-white px-4 py-2 text-sm font-semibold text-[#ba1a1a] transition-all hover:bg-[#fff0ef]"
                        onClick={() => openDeleteCategoryModal(selectedCategory)}
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        Xóa danh mục
                      </button>
                    </div>
                  </div>

                  {/* //@GATT Header bang attribute lay tu selectedCategory. */}
                  <div className="grid grid-cols-4 gap-4 px-4 py-2 text-[10px] font-bold text-[#707882] uppercase tracking-widest bg-[#f5faff] rounded-lg">
                    <span>Tên thuộc tính</span>
                    <span>Kiểu dữ liệu</span>
                    <span>Bắt buộc</span>
                    <span className="text-right">Thao tác</span>
                  </div>

                  {/* //@GATT Render tung attribute trong danh sach attributes da load tu API. */}
                  {attributes.map(attr => (
                    <div key={attr.id} className="rounded-2xl border border-[#edf5fb] px-4 py-4 transition-colors hover:bg-[#fcfdfe]">
                      <div className="grid grid-cols-4 gap-4 items-start">
                        <div>
                          {/* //@GATT Hien ten attribute cua category. */}
                          <p className="font-bold text-[#0f1d25]">{attr.name}</p>
                          {attr.options && attr.options.length > 0 && (
                            /* //@GOPT Hien so luong tuy chon da lay duoc cua attribute. */
                            <p className="text-[10px] text-[#707882] mt-1">{attr.options.length} tùy chọn khả dụng</p>
                          )}
                        </div>
                        <div>
                          {/* //@GATT Hien input_type cua attribute lay ve. */}
                          <span className="px-3 py-1 bg-[#e9f5ff] text-[#00629d] text-[10px] font-black rounded-lg uppercase">
                            {attr.input_type}
                          </span>
                        </div>
                        <div>
                          {/* //@GATT Hien trang thai bat buoc/khong bat buoc cua attribute. */}
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${attr.is_required ? 'bg-[#00629d] text-white' : 'border-2 border-[#e1f0fb] text-[#707882]'}`}>
                            <span className="material-symbols-outlined text-[10px] font-bold">
                              {attr.is_required ? 'check' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {/* //@PATT Nut mo modal chinh sua thuoc tinh dang render. */}
                          <button type="button" className="rounded-lg bg-[#f5faff] px-3 py-2 text-xs font-semibold text-[#00629d] transition-all hover:bg-[#00629d] hover:text-white" onClick={() => openEditAttributeModal(attr)}>
                            Chỉnh sửa
                          </button>
                          {/* //@DATT Nut xoa thuoc tinh dang render khoi danh muc. */}
                          <button type="button" className="rounded-lg bg-[#fff5f5] px-3 py-2 text-xs font-semibold text-[#ba1a1a] transition-all hover:bg-[#ba1a1a] hover:text-white" onClick={() => handleDeleteAttribute(attr)}>
                            Xóa
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 border-t border-[#edf5fb] pt-4">
                        {/* //@GOPT Khu vuc hien thi cac tuy chon da lay ve cua attribute. */}
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#707882]">Tùy chọn thuộc tính</p>
                        {attr.options && attr.options.length > 0 ? (
                          /* //@GOPT Render danh sach options tra ve trong attr.options. */
                          <div className="mt-3 flex flex-wrap gap-2">
                            {attr.options.map((option) => (
                              <div
                                key={option.id}
                                className="flex items-center gap-2 rounded-full border border-[#d6e7f6] bg-[#f8fbff] px-3 py-2 text-xs text-[#0f1d25]"
                              >
                                {/* //@GOPT Hien value_name cua tung option da lay tu API. */}
                                <span>{option.value_name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          /* //@GOPT Trang thai khi attribute khong co options tra ve. */
                          <p className="mt-3 text-xs text-[#707882]">
                            {supportsAttributeOptions(attr.input_type, attr.options)
                              ? 'No options yet. Open Edit to manage values in the dialog.'
                              : 'This input type does not use attribute options.'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* //@CATT Nut mo modal tao thuoc tinh moi cho danh muc dang chon. */}
                  <button
                    type="button"
                    className="w-full border-2 border-dashed border-[#e1f0fb] rounded-[24px] p-6 flex flex-col items-center justify-center text-[#707882] hover:border-[#00629d] hover:bg-[#e9f5ff]/20 transition-all cursor-pointer group disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#e1f0fb] disabled:hover:bg-transparent"
                    onClick={openAttributeModal}
                    disabled={hasReachedAttributeLimit}
                  >
                    <span className="material-symbols-outlined text-3xl mb-2 group-hover:scale-110 transition-transform">post_add</span>
                    <p className="text-sm font-semibold">Thêm thuộc tính mới cho {selectedCategory.name}</p>
                  </button>
                </div>
              )}
            </div>

            <div className="p-6 bg-[#f5faff] border-t border-[#e1f0fb]">
              <div className="bg-[#00629d] bg-opacity-5 rounded-2xl p-4 flex gap-4 items-center border border-[#00629d] border-opacity-10">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#00629d] shadow-sm">
                  <span className="material-symbols-outlined">lightbulb</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#00629d]">Mẹo Quản lý</p>
                  <p className="text-[10px] text-[#707882]">Kế thừa thuộc tính: Các danh mục con sẽ tự động kế thừa bộ thuộc tính của danh mục cha. Bạn có thể thêm các thuộc tính đặc thù riêng cho từng cấp con.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/*                            MODAL: XOA DANH MUC                            */}

      {/* //@DELETE Modal xac nhan xoa danh muc va hien cac rang buoc truoc khi xoa. */}
      {isDeleteCategoryModalOpen && deleteTargetCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1d25]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl shadow-[#0f1d25]/20">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                {/* //@DELETE Tieu de modal xoa danh muc dang target. */}
                <h3 className="text-xl font-bold text-[#0f1d25]">Xóa danh mục</h3>
                <p className="mt-1 text-sm text-[#707882]">
                  Kiểm tra sản phẩm và danh mục con trước khi xóa "{deleteTargetCategory.name}".
                </p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5faff] text-[#707882]"
                onClick={closeDeleteCategoryModal}
                disabled={deletingCategory}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {loadingDeleteImpact ? (
              /* //@DELETE Trang thai dang kiem tra dieu kien xoa danh muc. */
              <div className="rounded-2xl border border-[#e1f0fb] bg-[#f8fbff] p-5 text-sm text-[#707882]">
                Đang kiểm tra danh mục...
              </div>
            ) : deleteCategoryError ? (
              /* //@DELETE Hien loi neu khong kiem tra duoc impact hoac xoa that bai. */
              <div className="rounded-2xl border border-[#ffdad6] bg-[#fff8f7] p-5 text-sm text-[#ba1a1a]">
                {deleteCategoryError}
              </div>
            ) : deleteImpact ? (
              /* //@DELETE Hien thong tin impact de admin biet danh muc co san pham/con hay khong. */
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#e1f0fb] bg-[#f8fbff] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#707882]">Sản phẩm</p>
                    <p className="mt-2 text-2xl font-bold text-[#0f1d25]">{deleteImpact.productCount}</p>
                  </div>
                  <div className="rounded-2xl border border-[#e1f0fb] bg-[#f8fbff] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#707882]">Danh mục con</p>
                    <p className="mt-2 text-2xl font-bold text-[#0f1d25]">{deleteImpact.childrenCount}</p>
                  </div>
                </div>

                {deleteImpact.childrenCount > 0 ? (
                  /* //@DELETE Chan xoa neu danh muc van con danh muc con. */
                  <div className="rounded-2xl border border-[#ffdad6] bg-[#fff8f7] p-4 text-sm text-[#7d2924]">
                    Không thể xóa danh mục này vì vẫn còn danh mục con. Hãy xóa hoặc chuyển các danh mục con trước.
                  </div>
                ) : deleteImpact.productCount > 0 && deleteImpact.canReassignToFallback ? (
                  /* //@DELETE Co san pham thi khong xoa truc tiep; cho phep chuyen sang "Khac" roi xoa. */
                  <div className="rounded-2xl border border-[#ffe3a3] bg-[#fffaf0] p-4 text-sm text-[#6d4b00]">
                    Không thể xóa trực tiếp vì danh mục này đang có sản phẩm. Bạn có thể chuyển tất cả sản phẩm sang danh mục "{deleteImpact.fallbackCategory?.name ?? 'Khác'}" rồi xóa danh mục này.
                  </div>
                ) : deleteImpact.productCount > 0 ? (
                  /* //@DELETE Co san pham nhung khong co fallback phu hop thi chan xoa. */
                  <div className="rounded-2xl border border-[#ffdad6] bg-[#fff8f7] p-4 text-sm text-[#7d2924]">
                    Không thể xóa danh mục này vì đang có sản phẩm và không có danh mục thay thế phù hợp.
                  </div>
                ) : (
                  /* //@DELETE Khong co san pham va khong co con thi co the xoa truc tiep. */
                  <div className="rounded-2xl border border-[#ffdad6] bg-[#fff8f7] p-4 text-sm text-[#7d2924]">
                    Danh mục này không có sản phẩm. Thao tác xóa sẽ không thể hoàn tác.
                  </div>
                )}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="rounded-2xl border border-[#d6e7f6] px-5 py-3 font-semibold text-[#4b6472]"
                onClick={closeDeleteCategoryModal}
                disabled={deletingCategory}
              >
                Hủy
              </button>
              {deleteImpact?.canDelete && (
                /* //@DELETE Nut xoa truc tiep khi backend xac nhan canDelete la true. */
                <button
                  type="button"
                  className="rounded-2xl bg-[#ba1a1a] px-5 py-3 font-semibold text-white transition hover:bg-[#931313] disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() => handleDeleteCategory(false)}
                  disabled={deletingCategory}
                >
                  {deletingCategory ? 'Đang xóa...' : 'Xóa danh mục'}
                </button>
              )}
              {deleteImpact?.canReassignToFallback && (
                /* //@DELETE Nut chuyen toan bo san pham sang "Khac" roi xoa danh muc. */
                <button
                  type="button"
                  className="rounded-2xl bg-[#ba1a1a] px-5 py-3 font-semibold text-white transition hover:bg-[#931313] disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() => handleDeleteCategory(true)}
                  disabled={deletingCategory}
                >
                  {deletingCategory ? 'Đang xử lý...' : 'Chuyển sang Khác và xóa'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/*                            MODAL: TAO / SUA DANH MUC                            */}

      {isCategoryModalOpen && (
        /* //@Create Modal dung de tao moi danh muc; khi editingCategory co gia tri thi cung modal nay chuyen sang edit. */
        /* //@Put Modal nay cung dung cho sua danh muc khi editingCategory khac null. */
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1d25]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl shadow-[#0f1d25]/20">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                {/* //@Put Tieu de doi sang Edit category khi dang sua danh muc. */}
                <h3 className="text-xl font-bold text-[#0f1d25]">{editingCategory ? 'Edit category' : 'Create category'}</h3>
                <p className="mt-1 text-sm text-[#707882]">
                  {/* //@Put Mo ta cho biet che do edit khong cho doi danh muc cha. */}
                  {editingCategory
                    ? 'Update the category name and settings here. Parent stays unchanged in edit mode.'
                    : 'This posts to the admin category endpoint and refreshes the tree after save.'}
                </p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5faff] text-[#707882]"
                onClick={closeCategoryModal}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {categoryModalError && (
              <div className="mb-5 rounded-2xl border border-[#ffdad6] bg-[#fff8f7] px-4 py-3 text-sm font-semibold text-[#ba1a1a]">
                {categoryModalError}
              </div>
            )}

            {/* //@Create Form nhap thong tin va submit de tao danh muc moi. */}
            {/* //@Put Form nay submit cap nhat danh muc khi editingCategory co gia tri. */}
            <form className="space-y-5" onSubmit={handleCategorySubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Tên</span>
                  {/* //@Create Input ten danh muc moi. */}
                  {/* //@Put Input cap nhat ten danh muc dang sua. */}
                  <input
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={categoryForm.name}
                    onChange={(event) => {
                      setCategoryModalError(null);
                      setCategoryForm((prev) => ({ ...prev, name: event.target.value }));
                    }}
                    placeholder="Example: Electronics"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Slug (tùy chọn)</span>
                  {/* //@Create Input slug tuy chon cho danh muc moi. */}
                  {/* //@Put Input cap nhat slug cua danh muc dang sua. */}
                  <input
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={categoryForm.slug}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, slug: event.target.value }))}
                    placeholder="electronics"
                  />
                </label>

                {editingCategory ? (
                  /* //@Put Khi sua danh muc, UI chi hien parent hien tai va khong cho doi parent. */
                  <div className="rounded-2xl border border-[#d6e7f6] bg-[#f8fbff] px-4 py-3 text-sm text-[#4b6472] md:col-span-2">
                    Danh mục cha vẫn là{' '}
                    <span className="font-semibold text-[#0f1d25]">
                      {selectedParentCategories.length > 0
                        ? selectedParentCategories.map((category) => category.name).join(' / ')
                        : 'Root level'}
                    </span>{' '}
                    khi chỉnh sửa danh mục này.
                  </div>
                ) : (
                  /* //@Create Khoi chon danh muc cha chi hien khi tao moi category. */
                  <div className="space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[#0f1d25]">Danh mục cha</span>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#00629d] hover:underline"
                        onClick={() => {
                          //@Create Xoa parentSelectionPath de tao danh muc cap goc.
                          setParentSelectionPath([]);
                          setCategoryForm((prev) => ({ ...prev, parent_id: '' }));
                        }}
                      >
                        Đặt là rễ
                      </button>
                    </div>

                    <div className="rounded-2xl border border-[#d6e7f6] bg-[#f8fbff] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[#707882]">Chọn từng cấp</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {parentSelectionLevels.map((levelCategories, levelIndex) => (
                          <label key={`parent-level-${levelIndex}`} className="space-y-2">
                            <span className="text-xs font-semibold text-[#4b6472]">
                              Cấp {levelIndex + 1}
                            </span>
                            {/* //@Create Select tung cap giup chon parent_id cho danh muc moi. */}
                            <select
                              className="w-full rounded-2xl border border-[#d6e7f6] bg-white px-4 py-3 outline-none transition focus:border-[#00629d]"
                              value={parentSelectionPath[levelIndex]?.toString() ?? ''}
                              onChange={(event) => handleParentLevelChange(levelIndex, event.target.value)}
                            >
                              <option value="">
                                {levelIndex === 0 ? 'No parent (root category)' : `Stop at level ${levelIndex}`}
                              </option>
                              {levelCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        ))}
                      </div>

                      <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-[#4b6472]">
                        <span className="font-semibold text-[#0f1d25]">Danh mục cha:</span>{' '}
                        {selectedParentCategories.length > 0
                          ? selectedParentCategories.map((category) => category.name).join(' / ')
                          : 'Root level'}
                      </div>
                    </div>
                  </div>
                )}

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Thứ tự hiển thị</span>
                  {/* //@Create Thu tu sap xep cua danh muc moi trong cay. */}
                  {/* //@Put Cap nhat sort_order de doi thu tu hien thi cua danh muc. */}
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={categoryForm.sort_order}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                    placeholder="0"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Icon URL (tùy chọn)</span>
                  {/* //@Create Icon URL tuy chon de hien thi hinh dai dien danh muc. */}
                  {/* //@Put Cap nhat icon_url cua danh muc dang sua. */}
                  <input
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={categoryForm.icon_url}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, icon_url: event.target.value }))}
                    placeholder="https://..."
                  />
                </label>
              </div>

              <label className="flex items-center gap-3 rounded-2xl bg-[#f5faff] px-4 py-3 text-sm text-[#0f1d25]">
                {/* //@Create Checkbox quyet dinh danh muc moi co active ngay sau khi tao hay khong. */}
                {/* //@Put Checkbox bat/tat trang thai active cua danh muc dang sua. */}
                <input
                  type="checkbox"
                  checked={categoryForm.is_active}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                />
                Danh mục hoạt động
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-2xl border border-[#d6e7f6] px-5 py-3 font-semibold text-[#4b6472]"
                  onClick={closeCategoryModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-[#00629d] px-5 py-3 font-semibold text-white transition hover:bg-[#005183] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={submittingCategory}
                >
                  {/* //@Create Nut submit gui form tao moi; disabled khi API dang xu ly. */}
                  {/* //@Put Nut submit hien Save changes va gui PUT khi dang sua danh muc. */}
                  {submittingCategory ? 'Saving...' : editingCategory ? 'Save changes' : 'Create category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/*                            MODAL: TAO / SUA THUOC TINH                            */}

      {/* //@CATT Modal tao thuoc tinh moi cho selectedCategory; khi editingAttribute co gia tri thi cung modal nay dung de edit. */}
      {/* //@PATT Modal nay chuyen sang che do sua thuoc tinh khi editingAttribute khac null. */}
      {isAttributeModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0f1d25]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl shadow-[#0f1d25]/20">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                {/* //@CATT Tieu de hien Create attribute khi dang tao thuoc tinh moi. */}
                {/* //@PATT Tieu de hien Edit attribute khi dang chinh sua thuoc tinh. */}
                <h3 className="text-xl font-bold text-[#0f1d25]">{isEditingAttribute ? 'Edit attribute' : 'Create attribute'}</h3>
                <p className="mt-1 text-sm text-[#707882]">
                  {/* //@PATT Mo ta che do edit khi cap nhat dinh nghia thuoc tinh. */}
                  {isEditingAttribute
                    ? 'Update the attribute definition and its attached values in one dialog.'
                    : 'Create the attribute definition and add its values in one dialog.'}
                </p>
              </div>
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5faff] text-[#707882]"
                onClick={closeAttributeModal}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {attributeModalError && (
              <div className="mb-5 rounded-2xl border border-[#ffdad6] bg-[#fff8f7] px-4 py-3 text-sm font-semibold text-[#ba1a1a]">
                {attributeModalError}
              </div>
            )}

            {/* //@CATT Form nhap thong tin va submit tao thuoc tinh moi. */}
            {/* //@PATT Form nay submit cap nhat thuoc tinh khi editingAttribute co gia tri. */}
            <form className="space-y-5" onSubmit={handleAttributeSubmit}>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Tên</span>
                  {/* //@CATT Input ten thuoc tinh moi. */}
                  {/* //@PATT Input cap nhat ten thuoc tinh dang sua. */}
                  <input
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={attributeForm.name}
                    onChange={(event) => {
                      setAttributeModalError(null);
                      setAttributeForm((prev) => ({ ...prev, name: event.target.value }));
                    }}
                    placeholder="Example: Brand"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Loại nhập</span>
                  {/* //@CATT Input type hien duoc co dinh la dropdown cho thuoc tinh danh muc. */}
                  <div className="rounded-2xl border border-[#d6e7f6] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#00629d]">
                    {ATTRIBUTE_INPUT_TYPE}
                  </div>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-[#0f1d25]">Thứ tự hiển thị</span>
                  {/* //@CATT Input sort_order cua thuoc tinh moi. */}
                  {/* //@PATT Input cap nhat sort_order cua thuoc tinh dang sua. */}
                  <input
                    type="number"
                    className="w-full rounded-2xl border border-[#d6e7f6] px-4 py-3 outline-none transition focus:border-[#00629d]"
                    value={attributeForm.sort_order}
                    onChange={(event) => setAttributeForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                    placeholder="0"
                  />
                </label>

                <label className="flex items-center gap-3 rounded-2xl bg-[#f5faff] px-4 py-3 text-sm text-[#0f1d25] md:mt-8">
                  {/* //@CATT Checkbox danh dau thuoc tinh moi la required. */}
                  {/* //@PATT Checkbox cap nhat trang thai required cua thuoc tinh dang sua. */}
                  <input
                    type="checkbox"
                    checked={attributeForm.is_required}
                    onChange={(event) => setAttributeForm((prev) => ({ ...prev, is_required: event.target.checked }))}
                  />
                  Required field
                </label>

                {showOptionSection && (
                  /* //@COPT Khu vuc tao tuy chon cho cac input type can danh sach gia tri. */
                  <div className="space-y-3 rounded-2xl border border-[#d6e7f6] bg-[#f8fbff] p-4 md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0f1d25]">Giá trị tùy chọn</p>
                        <p className="text-xs text-[#707882]">Thêm các giá trị mà người mua có thể chọn cho thuộc tính này.</p>
                      </div>
                      {/* //@COPT Nut them mot gia tri tuy chon moi vao form. */}
                      <button
                        type="button"
                        className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-[#00629d] border border-[#d6e7f6] transition hover:bg-[#e9f5ff]"
                        onClick={handleAddAttributeOptionField}
                      >
                        Thêm giá trị
                      </button>
                    </div>

                    <div className="space-y-3">
                      {/* //@COPT Render cac dong tuy chon dang duoc tao trong form. */}
                      {/* //@POPT Khi sua attribute, cac dong option cu se co id de submit PUT. */}
                      {attributeOptions.map((option, index) => (
                        <div key={option.id ?? `new-option-${index}`} className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sm font-bold text-[#00629d] border border-[#d6e7f6]">
                            {index + 1}
                          </div>
                          {/* //@COPT Input nhap value_name cho tuy chon moi. */}
                          {/* //@POPT Input cap nhat value_name cua tuy chon cu neu option co id. */}
                          <input
                            className="flex-1 rounded-2xl border border-[#d6e7f6] bg-white px-4 py-3 outline-none transition focus:border-[#00629d]"
                            value={option.value_name}
                            onChange={(event) => handleAttributeOptionChange(index, event.target.value)}
                            placeholder={`Value ${index + 1}`}
                          />
                          {/* //@COPT Nut xoa dong tuy chon khoi form truoc khi submit. */}
                          {/* //@DOPT Neu dong nay la option cu co id, submit edit se xoa option do bang DELETE. */}
                          <button
                            type="button"
                            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ffd9d6] bg-white text-[#ba1a1a] transition hover:bg-[#fff0ef]"
                            onClick={() => handleRemoveAttributeOptionField(index)}
                            disabled={attributeOptions.length === 1}
                            title={attributeOptions.length === 1 ? 'At least one value is required' : 'Remove value'}
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="rounded-2xl border border-[#d6e7f6] px-5 py-3 font-semibold text-[#4b6472]"
                  onClick={closeAttributeModal}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-2xl bg-[#00629d] px-5 py-3 font-semibold text-white transition hover:bg-[#005183] disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={submittingAttribute}
                >
                  {/* //@CATT Nut submit tao attribute; disabled khi API dang xu ly. */}
                  {/* //@PATT Nut submit hien Save changes va gui PUT khi dang sua thuoc tinh. */}
                  {submittingAttribute ? 'Saving...' : isEditingAttribute ? 'Save changes' : 'Create attribute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/*                            STYLE: CUSTOM SCROLLBAR                            */}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e1f0fb;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #00629d;
        }
      `}</style>
    </AdminLayout>
  );
};

/*                               HELPER DOC LOI API                               */

const getResponseError = async (response: Response, fallbackMessage: string) => {
  const clone = response.clone();

  try {
    const data = await response.json();
    if (typeof data?.message === 'string') {
      return data.message;
    }
    if (Array.isArray(data?.message)) {
      return data.message.join(', ');
    }
  } catch {
    // Ignore JSON parsing failures and fall back to plain text.
  }

  try {
    const text = await clone.text();
    if (text.trim()) {
      return text.trim();
    }
  } catch {
    // Ignore text parsing failures and use the fallback message.
  }

  return fallbackMessage;
};

export default CategoryManagement;

