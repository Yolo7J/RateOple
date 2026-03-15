import { useQueryResource } from '../../../hooks/useQueryResource';
import userProfileService from '../services/userProfileService';

export const useMyProfileQuery = (enabled = true) => {
  return useQueryResource({
    queryKey: ['users', 'profile', 'me'],
    queryFn: () => userProfileService.getProfile(),
    enabled,
    initialData: null,
  });
};
