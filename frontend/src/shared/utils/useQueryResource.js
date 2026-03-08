import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const cache = new Map();
const inFlight = new Map();

const toKey = (queryKey) => JSON.stringify(queryKey);

export const invalidateQuery = (queryKey) => {
  const key = toKey(queryKey);
  cache.delete(key);
  inFlight.delete(key);
};

export const useQueryResource = ({ queryKey, queryFn, enabled = true, initialData = null }) => {
  const key = useMemo(() => toKey(queryKey), [queryKey]);
  const queryFnRef = useRef(queryFn);
  const [data, setData] = useState(() => cache.get(key) ?? initialData);
  const [loading, setLoading] = useState(enabled && !cache.has(key));
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

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
      let request = inFlight.get(key);
      if (!request || force) {
        request = Promise.resolve().then(() => queryFnRef.current());
        inFlight.set(key, request);
      }

      const result = await request;
      if (requestId !== requestIdRef.current) return;
      cache.set(key, result);
      setData(result);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err);
    } finally {
      inFlight.delete(key);
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, key]);

  useEffect(() => {
    run(false);
  }, [run]);

  const refetch = useCallback(async () => {
    await run(true);
  }, [run]);

  return { data, loading, error, refetch };
};
