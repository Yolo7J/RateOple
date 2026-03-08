import { useMutation, useQueryClient } from '@tanstack/react-query';
import userProfileService from '../services/userProfileService';

export const useProfileMutations = () => {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (payload) => userProfileService.updateProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'profile', 'me'], exact: true });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) =>
      userProfileService.changePassword(currentPassword, newPassword),
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (currentPassword) => userProfileService.deleteAccount(currentPassword),
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'session'], null);
      queryClient.removeQueries({ queryKey: ['users'] });
      queryClient.removeQueries({ queryKey: ['ratings'] });
      queryClient.removeQueries({ queryKey: ['reviews'] });
    },
  });

  return {
    updateProfile: updateMutation.mutateAsync,
    changePassword: ({ currentPassword, newPassword }) =>
      changePasswordMutation.mutateAsync({ currentPassword, newPassword }),
    deleteAccount: deleteAccountMutation.mutateAsync,
    loading:
      updateMutation.isPending ||
      changePasswordMutation.isPending ||
      deleteAccountMutation.isPending,
    error:
      updateMutation.error ||
      changePasswordMutation.error ||
      deleteAccountMutation.error,
  };
};
