import lookupApi from '../../../shared/api/lookupApi';

export const searchMedia = (params = {}) => lookupApi.media(params);

export default { searchMedia };
