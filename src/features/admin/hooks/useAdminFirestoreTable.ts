import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import type { AdminPageResult } from '../api/adminRacesRepository';

const SEARCH_DEBOUNCE_MS = 300;

interface UseAdminFirestoreTableOptions<T> {
  pageSize: number;
  loadPage: (
    cursor: QueryDocumentSnapshot<DocumentData> | null
  ) => Promise<AdminPageResult<T>>;
  searchAll: (query: string) => Promise<T[]>;
}

interface UseAdminFirestoreTableResult<T> {
  rows: T[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  isSearching: boolean;
  listError: string;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reloadList: () => Promise<void>;
  isSearchActive: boolean;
}

export function useAdminFirestoreTable<T>({
  loadPage,
  searchAll
}: UseAdminFirestoreTableOptions<T>): UseAdminFirestoreTableResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [searchRows, setSearchRows] = useState<T[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [listError, setListError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const searchRequestRef = useRef(0);

  const isSearchActive = searchQuery.trim().length > 0;

  const reloadList = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setListError('');
    try {
      const page = await loadPage(null);
      setItems(page.items);
      setHasMore(page.hasMore);
      cursorRef.current = page.cursor;
    } catch {
      setListError('load_failed');
      setItems([]);
      setHasMore(false);
      cursorRef.current = null;
    } finally {
      setIsLoading(false);
    }
  }, [loadPage]);

  const loadMore = useCallback(async (): Promise<void> => {
    if (isSearchActive || !hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const page = await loadPage(cursorRef.current);
      setItems((current) => [...current, ...page.items]);
      setHasMore(page.hasMore);
      cursorRef.current = page.cursor;
    } catch {
      setListError('load_failed');
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, isSearchActive, loadPage]);

  useEffect(() => {
    void reloadList();
  }, [reloadList]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchRows([]);
      setIsSearching(false);
      return;
    }

    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    setIsSearching(true);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const results = await searchAll(trimmed);
          if (searchRequestRef.current !== requestId) {
            return;
          }
          setSearchRows(results);
          setListError('');
        } catch {
          if (searchRequestRef.current !== requestId) {
            return;
          }
          setSearchRows([]);
          setListError('search_failed');
        } finally {
          if (searchRequestRef.current === requestId) {
            setIsSearching(false);
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchAll, searchQuery]);

  const rows = isSearchActive ? searchRows : items;

  return {
    rows,
    searchQuery,
    setSearchQuery,
    isLoading: isLoading && !isSearchActive,
    isLoadingMore,
    isSearching,
    listError,
    hasMore: !isSearchActive && hasMore,
    loadMore,
    reloadList,
    isSearchActive
  };
}
