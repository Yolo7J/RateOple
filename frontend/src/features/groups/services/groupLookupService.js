import lookupApi from '../../../shared/api/lookupApi';

export const searchGroups = (params = {}) => lookupApi.groups(params);

export default { searchGroups };
