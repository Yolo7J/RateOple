export const groupId = 'group-cinema';
export const collectionId = 'collection-classics';

export function createGroupDetail(overrides = {}) {
  return {
    id: groupId,
    name: 'Cinema Club',
    description: 'A staff-managed group for film discussion.',
    membersCount: 24,
    postsCount: 0,
    viewerRole: 4,
    ...overrides,
  };
}

export function createCollectionDetail(overrides = {}) {
  return {
    id: collectionId,
    name: 'Modern Classics',
    description: 'Owner curated media.',
    ownerType: 2,
    ownerId: 'user-admin-1',
    followersCount: 5,
    sortMode: 3,
    items: [],
    ...overrides,
  };
}

export function createReport(overrides = {}) {
  return {
    id: 'report-1',
    targetType: 3,
    targetDisplayName: 'Cinema Club post',
    reporterDisplayName: 'Alex Reporter',
    status: 1,
    reason: 'Spam in group discussion.',
    createdAt: '2026-05-01T08:00:00Z',
    updatedAt: '2026-05-01T08:00:00Z',
    ...overrides,
  };
}

export async function mockGroupDetailPage(page, options = {}) {
  await page.route(`**/api/groups/${groupId}`, async (route) => {
    await route.fulfill({ json: options.group ?? createGroupDetail() });
  });
  await page.route(`**/api/groups/${groupId}/posts**`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        json: { id: 'post-created', groupId, title: 'Created post' },
      });
      return;
    }
    await route.fulfill({ json: options.posts ?? { items: [], page: 1, pageSize: 30, totalCount: 0 } });
  });
  await page.route(`**/api/groups/${groupId}/pinned-media`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }
    await route.fulfill({ json: options.pinned ?? [] });
  });
  await page.route(`**/api/groups/${groupId}/members`, async (route) => {
    await route.fulfill({ json: options.members ?? [] });
  });
  await page.route(`**/api/groups/${groupId}/staff/messages`, async (route) => {
    await route.fulfill({ json: options.staffMessages ?? [] });
  });
}

export async function mockCollectionDetailPage(page, options = {}) {
  const collection = options.collection ?? createCollectionDetail();
  await page.route(`**/api/collections/${collectionId}`, async (route) => {
    await route.fulfill({ json: collection });
  });
  await page.route(`**/api/collections?**`, async (route) => {
    await route.fulfill({ json: { items: [], page: 1, pageSize: 50, totalCount: 0 } });
  });
  await page.route(`**/api/collections/${collectionId}/items`, async (route) => {
    await route.fulfill({
      json: {
        ...collection,
        items: [
          ...(collection.items ?? []),
          { mediaId: 'media-spirited-away', mediaTitle: 'Spirited Away', coverUrl: null },
        ],
      },
    });
  });
}

export async function mockModerationPage(page, options = {}) {
  await page.route('**/api/moderation/reports**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        json: options.reports ?? { items: [createReport()], page: 1, pageSize: 50, totalCount: 1 },
      });
      return;
    }
    await route.fulfill({ json: {} });
  });
  await page.route('**/api/moderation/assignments**', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        json: {
          userId: 'user-moderator-2',
          userName: 'Mira Moderator',
          scopeType: 2,
          scopeId: 'group-cinema',
          scopeName: 'Cinema Club',
        },
      });
      return;
    }
    await route.fulfill({ json: options.assignments ?? [] });
  });
  await page.route('**/api/groups/group-cinema/bans', async (route) => {
    await route.fulfill({ json: { groupId: 'group-cinema', userId: 'user-reported-3' } });
  });
}

export async function mockSuccessfulMutations(page) {
  await page.route('**/api/**', async (route) => {
    const method = route.request().method();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      await route.fulfill({ json: {} });
      return;
    }
    await route.fallback();
  });
}
