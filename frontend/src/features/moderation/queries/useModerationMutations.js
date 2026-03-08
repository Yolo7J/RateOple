import { useMutation, useQueryClient } from '@tanstack/react-query';
import moderationService from '../services/moderationService';

export const useModerationMutations = () => {
  const queryClient = useQueryClient();

  const invalidateModeration = () => {
    queryClient.invalidateQueries({ queryKey: ['moderation', 'reports'] });
    queryClient.invalidateQueries({ queryKey: ['moderation', 'assignments'] });
  };

  const updateReportStatusMutation = useMutation({
    mutationFn: ({ reportId, status }) => moderationService.updateReportStatus(reportId, status),
    onSuccess: invalidateModeration,
  });

  const createAssignmentMutation = useMutation({
    mutationFn: (payload) => moderationService.createAssignment(payload),
    onSuccess: invalidateModeration,
  });

  const removeAssignmentMutation = useMutation({
    mutationFn: (payload) => moderationService.removeAssignment(payload),
    onSuccess: invalidateModeration,
  });

  const createReportMutation = useMutation({
    mutationFn: (payload) => moderationService.createReport(payload),
    onSuccess: invalidateModeration,
  });

  return {
    updateReportStatus: (reportId, status) => updateReportStatusMutation.mutateAsync({ reportId, status }),
    createAssignment: createAssignmentMutation.mutateAsync,
    removeAssignment: removeAssignmentMutation.mutateAsync,
    createReport: createReportMutation.mutateAsync,
    loading:
      updateReportStatusMutation.isPending ||
      createAssignmentMutation.isPending ||
      removeAssignmentMutation.isPending ||
      createReportMutation.isPending,
    error:
      updateReportStatusMutation.error ||
      createAssignmentMutation.error ||
      removeAssignmentMutation.error ||
      createReportMutation.error,
  };
};
