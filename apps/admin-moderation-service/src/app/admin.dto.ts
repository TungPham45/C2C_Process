export class CategoryDto {
  name: string;
  parent_id?: number | null;
  sort_order?: number;
  icon_url?: string | null;
  is_active?: boolean;
}

export class AttributeDefinitionDto {
  name: string;
  input_type: string;
  is_required: boolean;
  options?: string[];
}

export class AttributeOptionDto {
  value_name: string;
}
