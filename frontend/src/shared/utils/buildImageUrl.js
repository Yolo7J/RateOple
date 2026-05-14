const LOCAL_IMAGE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const shouldUpgradeHttpImage = (imageUrl) => {
  if (!import.meta.env.PROD || imageUrl.protocol !== 'http:') return false;
  return !LOCAL_IMAGE_HOSTS.has(imageUrl.hostname);
};

export const buildImageUrl = (url, fallback = 'https://placehold.co/320x480?text=No+Image') => {
  const value = url || fallback;
  if (!value) return value;
  if (!/^https?:\/\//i.test(value)) return value;

  try {
    const imageUrl = new URL(value);
    if (shouldUpgradeHttpImage(imageUrl)) {
      imageUrl.protocol = 'https:';
    }
    return imageUrl.href;
  } catch {
    return value;
  }
};
