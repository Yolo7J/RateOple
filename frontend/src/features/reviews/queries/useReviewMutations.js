import { useCallback, useState } from 'react';
import reviewService from '../services/reviewService';

export const useReviewMutations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createReview = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      return await reviewService.createReview(payload);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createReview, loading, error };
};
