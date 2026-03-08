export const buildImageUrl = (url, fallback = 'https://placehold.co/320x480?text=No+Image') => {
  return url || fallback;
};
