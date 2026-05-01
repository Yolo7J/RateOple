export const mediaOptions = [
  { id: 'media-spirited-away', label: 'Spirited Away', subtitle: 'Movie · 2001', type: 'Movie' },
  { id: 'media-arrival', label: 'Arrival', subtitle: 'Movie · 2016', type: 'Movie' },
  { id: 'media-foundation', label: 'Foundation', subtitle: 'Book · 1951', type: 'Book' },
];

export const userOptions = [
  { id: 'user-moderator-2', label: 'Mira Moderator', subtitle: '@mira', type: 'User' },
  { id: 'user-reported-3', label: 'Nikolai Reader', subtitle: '@nikolai', type: 'User' },
];

export const groupScopeOptions = [
  { id: 'group-cinema', label: 'Cinema Club', subtitle: 'Group · Public', type: 'Group' },
  { id: 'group-books', label: 'Book Circle', subtitle: 'Group · Private', type: 'Group' },
];

export const collectionScopeOptions = [
  { id: 'collection-classics', label: 'Modern Classics', subtitle: 'Collection · 12 items', type: 'Collection' },
];

export const mediaScopeOptions = [
  { id: 'media-arrival', label: 'Arrival', subtitle: 'Media · Movie · 2016', type: 'Media' },
];

const lookupPayload = (items) => ({
  items,
  page: 1,
  pageSize: items.length,
  totalCount: items.length,
  totalPages: items.length ? 1 : 0,
});

const filterItems = (items, request) => {
  const search = new URL(request.url()).searchParams.get('search')?.toLowerCase() ?? '';
  if (!search) return items;
  return items.filter((item) => (
    `${item.label} ${item.subtitle ?? ''}`.toLowerCase().includes(search)
  ));
};

export async function mockLookup(page, path, items, options = {}) {
  await page.route(`**/api/${path}/lookup**`, async (route, request) => {
    if (options.fail) {
      await route.fulfill({ status: 500, json: { message: 'Lookup failed.' } });
      return;
    }

    await route.fulfill({ json: lookupPayload(filterItems(items, request)) });
  });
}

export async function mockMediaLookup(page, items = mediaOptions, options = {}) {
  await mockLookup(page, 'media', items, options);
}

export async function mockUserLookup(page, items = userOptions, options = {}) {
  await mockLookup(page, 'admin/users', items, options);
  await mockLookup(page, 'users', items, options);
}

export async function mockGroupLookup(page, items = groupScopeOptions, options = {}) {
  await mockLookup(page, 'groups', items, options);
}

export async function mockCollectionLookup(page, items = collectionScopeOptions, options = {}) {
  await mockLookup(page, 'collections', items, options);
}

export async function mockModerationScopeLookup(page, optionsByScope = {}, options = {}) {
  await page.route('**/api/moderation/scopes/lookup**', async (route, request) => {
    if (options.fail) {
      await route.fulfill({ status: 500, json: { message: 'Lookup failed.' } });
      return;
    }

    const scopeType = new URL(request.url()).searchParams.get('scopeType') ?? '2';
    const items = optionsByScope[scopeType]
      ?? { 2: groupScopeOptions, 3: collectionScopeOptions, 4: mediaScopeOptions }[scopeType]
      ?? [];
    await route.fulfill({ json: lookupPayload(filterItems(items, request)) });
  });
}
