import api from './apiClient';

const normalizeLookupParams = (params = {}) => ({
  search: params.search || undefined,
  type: params.type || undefined,
  visibility: params.visibility || undefined,
  scopeType: params.scopeType || undefined,
  page: params.page ?? 1,
  pageSize: params.pageSize ?? 20,
});

const toPagedResult = (data, mapItem) => ({
  items: (data?.items ?? []).map(mapItem),
  totalCount: data?.totalCount ?? 0,
  page: data?.page ?? 1,
  pageSize: data?.pageSize ?? 20,
});

export const toEntityOption = (item) => ({
  id: item.id,
  label: item.label ?? item.title ?? item.name ?? item.displayName ?? item.username ?? 'Untitled',
  subtitle: item.subtitle ?? '',
  imageUrl: item.imageUrl ?? item.coverUrl ?? item.avatarUrl ?? null,
  type: item.type ?? null,
  meta: item,
});

export const lookupApi = {
  media: async (params = {}) => {
    const response = await api.get('/media/lookup', { params: normalizeLookupParams(params) });
    return toPagedResult(response.data, toEntityOption);
  },

  users: async (params = {}) => {
    const response = await api.get('/users/lookup', { params: normalizeLookupParams(params) });
    return toPagedResult(response.data, toEntityOption);
  },

  adminUsers: async (params = {}) => {
    const response = await api.get('/admin/users/lookup', { params: normalizeLookupParams(params) });
    return toPagedResult(response.data, toEntityOption);
  },

  moderatorCandidates: async (params = {}) => {
    const response = await api.get('/admin/moderator-candidates/lookup', { params: normalizeLookupParams(params) });
    return toPagedResult(response.data, toEntityOption);
  },

  groups: async (params = {}) => {
    const response = await api.get('/groups/lookup', { params: normalizeLookupParams(params) });
    return toPagedResult(response.data, toEntityOption);
  },

  collections: async (params = {}) => {
    const response = await api.get('/collections/lookup', { params: normalizeLookupParams(params) });
    return toPagedResult(response.data, toEntityOption);
  },

  moderationScopes: async (params = {}) => {
    const response = await api.get('/moderation/scopes/lookup', { params: normalizeLookupParams(params) });
    return toPagedResult(response.data, toEntityOption);
  },
};

export default lookupApi;
