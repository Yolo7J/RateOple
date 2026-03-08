import { useCallback, useState } from 'react';
import statusService from '../../../services/statusService';

export const useMediaStatusMutation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (mediaId, status) => {
    setLoading(true);
    setError(null);
    try {
      return await statusService.setMediaStatus(mediaId, status);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
};
