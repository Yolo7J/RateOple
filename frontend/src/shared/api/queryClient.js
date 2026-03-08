import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      // Keep data immediately stale so queries with initialData still fetch real server state.
      staleTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});
