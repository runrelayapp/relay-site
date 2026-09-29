import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { getFirebaseContext } from '@/shared/firebase';
import {
  listOrganizerEventParticipantsPage,
  ORGANIZER_PARTICIPANTS_PAGE_SIZE,
  searchOrganizerEventParticipants,
  type OrganizerParticipantsPageResult
} from '../api/organizerEventsRepository';
import type { OrganizerEventParticipant } from '../model/types';

const SEARCH_DEBOUNCE_MS = 300;

interface UseOrganizerParticipantsTableResult {
  rows: OrganizerEventParticipant[];
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  isLoading: boolean;
  isLoadingMore: boolean;
  isSearching: boolean;
  listError: '' | 'load_failed' | 'search_failed' | 'unavailable';
  hasMore: boolean;
  loadMore: () => Promise<void>;
  isSearchActive: boolean;
}

export function useOrganizerParticipantsTable(
  eventCode: string
): UseOrganizerParticipantsTableResult {
  const [items, setItems] = useState<OrganizerEventParticipant[]>([]);
  const [searchRows, setSearchRows] = useState<OrganizerEventParticipant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [listError, setListError] = useState<
    '' | 'load_failed' | 'search_failed' | 'unavailable'
  >('');
  const [hasMore, setHasMore] = useState(false);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const searchRequestRef = useRef(0);
  const code = eventCode.trim();

  const isSearchActive = searchQuery.trim().length > 0;

  const reloadList = useCallback(async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !code) {
      setItems([]);
      setHasMore(false);
      setIsLoading(false);
      setListError(code ? 'unavailable' : '');
      return;
    }

    setIsLoading(true);
    setListError('');
    try {
      const page: OrganizerParticipantsPageResult =
        await listOrganizerEventParticipantsPage(firebaseCtx, code, ORGANIZER_PARTICIPANTS_PAGE_SIZE, null);
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
  }, [code]);

  const loadMore = useCallback(async (): Promise<void> => {
    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx || !code || isSearchActive || !hasMore || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    try {
      const page = await listOrganizerEventParticipantsPage(
        firebaseCtx,
        code,
        ORGANIZER_PARTICIPANTS_PAGE_SIZE,
        cursorRef.current
      );
      setItems((current) => [...current, ...page.items]);
      setHasMore(page.hasMore);
      cursorRef.current = page.cursor;
    } catch {
      setListError('load_failed');
    } finally {
      setIsLoadingMore(false);
    }
  }, [code, hasMore, isLoadingMore, isSearchActive]);

  useEffect(() => {
    setSearchQuery('');
    setSearchRows([]);
    void reloadList();
  }, [reloadList]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || !code) {
      setSearchRows([]);
      setIsSearching(false);
      return;
    }

    const firebaseCtx = getFirebaseContext();
    if (!firebaseCtx) {
      setListError('unavailable');
      return;
    }

    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    setIsSearching(true);

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const results = await searchOrganizerEventParticipants(firebaseCtx, code, trimmed);
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
  }, [code, searchQuery]);

  const rows = isSearchActive ? searchRows : items;

  return {
    rows,
    searchQuery,
    setSearchQuery,
    isLoading,
    isLoadingMore,
    isSearching,
    listError,
    hasMore: !isSearchActive && hasMore,
    loadMore,
    isSearchActive
  };
}
