import lookupApi from '../../../shared/api/lookupApi';

export const searchUsers = (params = {}) => lookupApi.users(params);

export const searchModerationUsers = (params = {}) => lookupApi.adminUsers(params);

export default { searchUsers, searchModerationUsers };
