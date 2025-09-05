import {useMemo} from 'react';
import type Fuse from 'fuse.js';

import {useSearchQueryBuilder} from 'sentry/components/searchQueryBuilder/context';
import type {KeyItem} from 'sentry/components/searchQueryBuilder/tokens/filterKeyListBox/types';
import {
  createItem,
  createFilterValueItem,
} from 'sentry/components/searchQueryBuilder/tokens/filterKeyListBox/utils';
import {defined} from 'sentry/utils';
import {useFuzzySearch} from 'sentry/utils/fuzzySearch';

const FUZZY_SEARCH_OPTIONS: Fuse.IFuseOptions<KeyItem> = {
  keys: ['label', 'description'],
  threshold: 0.2,
  includeMatches: false,
  minMatchCharLength: 1,
};

const FILTER_VALUE_SEARCH_OPTIONS: Fuse.IFuseOptions<KeyItem> = {
  keys: ['value'],
  threshold: 0.2,
  includeMatches: false,
  minMatchCharLength: 1,
};

export function useSortedFilterKeyItems({filterValue}: {filterValue: string}): KeyItem[] {
  const {filterKeys, getFieldDefinition, filterKeySections} = useSearchQueryBuilder();
  const flatItems = useMemo<KeyItem[]>(
    () =>
      Object.values(filterKeys).map(filterKey =>
        createItem(filterKey, getFieldDefinition(filterKey.key))
      ),
    [filterKeys, getFieldDefinition]
  );
  const filterValueItems = useMemo<KeyItem[]>(() => {
    return Object.values(filterKeys).flatMap(filterKey => {
      if (!filterKey.values?.length) {
        return [];
      }

      return filterKey.values.map(value =>
        createFilterValueItem(
          filterKey.key,
          value,
          `${filterKey.name}:${value}`
        )
      );
    });
  }, [filterKeys]);

  const search = useFuzzySearch(flatItems, FUZZY_SEARCH_OPTIONS);
  const valueSearch = useFuzzySearch(filterValueItems, FILTER_VALUE_SEARCH_OPTIONS);

  return useMemo(() => {
    if (!filterValue || !search || !valueSearch) {
      if (!filterKeySections.length) {
        return flatItems.sort((a, b) => a.textValue.localeCompare(b.textValue));
      }

      return filterKeySections
        .flatMap(section => section.children)
        .map(key => flatItems.find(item => item.key === key))
        .filter(defined);
    }

    const keyResults = search.search(filterValue).map(({item}) => item);
    const valueResults = valueSearch.search(filterValue).map(({item}) => item);

    const results = [...valueResults, ...keyResults];

    if (filterValue.includes(' ')) {
      results.push(
        createFilterValueItem('', `"${filterValue}"`, `"${filterValue}"`)
      );
    }

    return results;
  }, [filterKeySections, filterValue, flatItems, search, valueSearch]);
}
