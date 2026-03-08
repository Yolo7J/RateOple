import { useMutation, useQueryClient } from '@tanstack/react-query';
import notificationService from '../services/notificationService';

export const useNotificationMutations = () => {
  const queryClient = useQueryClient();

  const invalidateNotifications = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
  };

  const markReadMutation = useMutation({
    mutationFn: (notificationId) => notificationService.markRead(notificationId),
    onSuccess: invalidateNotifications,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: invalidateNotifications,
  });

  return {
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
    loading: markReadMutation.isPending || markAllReadMutation.isPending,
    error: markReadMutation.error || markAllReadMutation.error,
  };
};
