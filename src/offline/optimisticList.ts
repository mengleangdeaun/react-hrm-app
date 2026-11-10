import type { QueryClient,QueryKey } from '@tanstack/react-query';

/** Page shape shared by the paginated list screens (leave requests, activities). */
interface ListPage<T> {
    items: T[];
    page: number;
    hasMore: boolean;
}

interface InfiniteListData<T> {
    pages: ListPage<T>[];
    pageParams: unknown[];
}

/**
 * Show a record that was saved offline at the top of a paginated list.
 *
 * The list screens use `useInfiniteQuery`, whose cache entry is `{ pages, pageParams }`. Writing a
 * plain array into that entry (what the submit screens used to do) makes the list screen crash on
 * `data.pages.flatMap` the moment the user lands on it after "Saved Offline".
 *
 * When the list has never been loaded, a single local page is seeded so the record is still
 * visible; the next successful fetch replaces it with server data.
 */
export function prependToInfiniteList<T>(queryClient: QueryClient, queryKey: QueryKey, item: T): void {
    queryClient.setQueryData<InfiniteListData<T>>(queryKey, (old) => {
        if (!old || !Array.isArray(old.pages) || old.pages.length === 0) {
            return { pages: [{ items: [item], page: 1, hasMore: false }], pageParams: [1] };
        }
        const [first, ...rest] = old.pages;
        return {
            ...old,
            pages: [{ ...first, items: [item, ...(Array.isArray(first.items) ? first.items : [])] }, ...rest],
        };
    });
}
