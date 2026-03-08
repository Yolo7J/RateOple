import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const cache = new Map();

const toKey = (queryKey) => JSON.stringify(queryKey);

export const invalidateQuery = (queryKey) => {
  cache.delete(toKey(queryKey));
};

export const useQueryResource = ({ queryKey, queryFn, enabled = true, initialData = null }) => {
  const key = useMemo(() => toKey(queryKey), [queryKey]);
  const [data, setData] = useState(() => cache.get(key) ?? initialData);
  const [loading, setLoading] = useState(enabled && !cache.has(key));
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const run = useCallback(async (force = false) => {
    if (!enabled) return;
    if (!force && cache.has(key)) {
      setData(cache.get(key));
      setLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      if (requestId !== requestIdRef.current) return;
      cache.set(key, result);
      setData(result);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, key, queryFn]);

  useEffect(() => {
    run(false);
  }, [run]);

  const refetch = useCallback(async () => {
    await run(true);
  }, [run]);

  return { data, loading, error, refetch };
};
