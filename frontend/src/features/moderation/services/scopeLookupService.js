import lookupApi from '../../../shared/api/lookupApi';

export const searchModerationScopes = (params = {}) => lookupApi.moderationScopes(params);

export default { searchModerationScopes };
