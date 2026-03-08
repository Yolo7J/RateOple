export const formatRating = (value, max = 10) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return `0/${max}`;
  return `${value}/${max}`;
};
