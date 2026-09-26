import { useQuery } from '@tanstack/react-query';
import { searchCards } from '@/lib/api';
import { CatalogApiError } from '@/shared/types';
import { useDebouncedValue } from '@/shared/hooks/useLiveQuery';
import { useUiStore } from '@/shared/hooks/useUiStore';
import { strings } from '@/shared/i18n/pt-BR';
import { EmptyState } from '@/shared/ui/EmptyState';
import { CardGrid } from './CardGrid';
import styles from './CardSearch.module.css';

export function CardSearch() {
  const query = useUiStore((s) => s.searchQuery);
  const setSearchQuery = useUiStore((s) => s.setSearchQuery);
  const debounced = useDebouncedValue(query, 300);

  const { data, isFetching, isError, error, isSuccess } = useQuery({
    queryKey: ['cards', 'search', debounced],
    queryFn: () => searchCards(debounced),
    enabled: debounced.trim().length > 0,
    retry: 1,
  });

  let errorMessage: string = strings.search.error;
  if (error instanceof CatalogApiError) {
    if (error.kind === 'network') errorMessage = strings.search.offline;
    if (error.kind === 'rateLimit') errorMessage = strings.search.rateLimit;
    if (error.kind === 'empty') errorMessage = strings.search.noResults;
  }

  return (
    <section className={styles.section}>
      <label className={styles.label} htmlFor="card-search">
        {strings.search.label}
      </label>
      <input
        id="card-search"
        className={styles.input}
        type="search"
        value={query}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={strings.search.placeholder}
        autoComplete="off"
        enterKeyHint="search"
      />

      {!debounced.trim() && <EmptyState title={strings.search.emptyQuery} />}

      {debounced.trim() && isFetching && (
        <p className={styles.status} role="status">
          {strings.search.loading}
        </p>
      )}

      {debounced.trim() && isError && error instanceof CatalogApiError && error.kind === 'empty' && (
        <EmptyState title={strings.search.noResults} />
      )}

      {debounced.trim() && isError && !(error instanceof CatalogApiError && error.kind === 'empty') && (
        <EmptyState title={errorMessage} />
      )}

      {isSuccess && data && data.length > 0 && <CardGrid cards={data} />}
    </section>
  );
}
