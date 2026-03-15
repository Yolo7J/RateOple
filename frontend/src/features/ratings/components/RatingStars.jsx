import clsx from 'clsx';

const styles = {
  container: 'inline-flex gap-1 text-[#8a8d94]',
  star: 'text-base leading-none',
  full: 'text-[#f5b301]',
  half: 'text-[#f5b301] opacity-60',
};

function RatingStars({ rating = 0 }) {
    const fiveStarValue = Math.max(0, Math.min(5, rating / 2));
    const full = Math.floor(fiveStarValue);
    const half = fiveStarValue - full >= 0.5;

    return (
        <div className={styles.container} aria-label={`Rating ${rating} out of 10`}>
            {Array.from({ length: 5 }).map((_, index) => {
                const isFull = index < full;
                const isHalf = index === full && half;
                return (
                    <span
                      key={index}
                      className={clsx(styles.star, isFull && styles.full, isHalf && styles.half)}
                    >
                        ★
                    </span>
                );
            })}
        </div>
    );
}

export default RatingStars;
