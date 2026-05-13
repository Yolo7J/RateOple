import lookupApi from '../../../shared/api/lookupApi';

export const searchUsers = (params = {}) => lookupApi.users(params);

export const searchModerationUsers = (params = {}) => lookupApi.adminUsers(params);

export const searchModeratorCandidates = (params = {}) => lookupApi.moderatorCandidates(params);

export default { searchUsers, searchModerationUsers, searchModeratorCandidates };
