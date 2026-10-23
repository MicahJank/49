import type {FilterKey} from 'sentry/types/search';
import type {FieldDefinition} from 'sentry/utils/fields';

import type {KeyItem} from './types';

export function createItem(
  filterKey: FilterKey,
  fieldDefinition: FieldDefinition | null
): KeyItem {
  return {
    key: filterKey.key,
    value: filterKey.key,
    label: filterKey.name,
    description: fieldDefinition?.description ?? '',
    textValue: filterKey.name,
    type: 'item' as const,
    showDetailsInOverlay: true,
    hideCheck: true,
    details: null,
  };
}

export function createFilterValueItem(
  key: string,
  value: string,
  label: string
): KeyItem {
  return {
    key: `${key}:${value}`,
    value: `${key}:${value}`,
    label,
    description: '',
    textValue: label,
    type: 'item' as const,
    showDetailsInOverlay: false,
    hideCheck: true,
    details: null,
  };
}