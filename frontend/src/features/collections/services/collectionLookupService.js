import lookupApi from '../../../shared/api/lookupApi';

export const searchCollections = (params = {}) => lookupApi.collections(params);

export default { searchCollections };
