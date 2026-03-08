import { useCallback, useState } from 'react';
import ratingService from '../services/ratingService';

export const useRateMediaMutation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (mediaId, value) => {
    setLoading(true);
    setError(null);
    try {
      return await ratingService.rateMedia(mediaId, value);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};
