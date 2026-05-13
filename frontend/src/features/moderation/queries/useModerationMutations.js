import { useMutation, useQueryClient } from '@tanstack/react-query';
import moderationService from '../services/moderationService';

export const useModerationMutations = () => {
  const queryClient = useQueryClient();

  const invalidateModeration = () => {
    queryClient.invalidateQueries({ queryKey: ['moderation', 'reports'] });
    queryClient.invalidateQueries({ queryKey: ['moderation', 'assignments'] });
  };

  const updateReportStatusMutation = useMutation({
    mutationFn: ({ reportId, status, note }) => moderationService.updateReportStatus(reportId, status, note),
    onSuccess: invalidateModeration,
  });

  const removeReportTargetMutation = useMutation({
    mutationFn: ({ reportId, reason }) => moderationService.removeReportTarget(reportId, reason),
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
    updateReportStatus: (reportId, status, note) => updateReportStatusMutation.mutateAsync({ reportId, status, note }),
    removeReportTarget: (reportId, reason) => removeReportTargetMutation.mutateAsync({ reportId, reason }),
    createAssignment: createAssignmentMutation.mutateAsync,
    removeAssignment: removeAssignmentMutation.mutateAsync,
    createReport: createReportMutation.mutateAsync,
    loading:
      updateReportStatusMutation.isPending ||
      removeReportTargetMutation.isPending ||
      createAssignmentMutation.isPending ||
      removeAssignmentMutation.isPending ||
      createReportMutation.isPending,
    error:
      updateReportStatusMutation.error ||
      removeReportTargetMutation.error ||
      createAssignmentMutation.error ||
      removeAssignmentMutation.error ||
      createReportMutation.error,
  };
};
