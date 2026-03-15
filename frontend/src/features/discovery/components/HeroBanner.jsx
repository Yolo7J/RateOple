import { useNavigate } from 'react-router-dom';

const styles = {
  banner: [
    'relative overflow-hidden rounded-2xl border border-[var(--border)]',
    'cursor-pointer',
  ].join(' '),
  image: 'h-[60vh] max-h-[460px] w-full object-cover',
  overlay: 'absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 to-transparent',
  pill: [
    'inline-flex items-center rounded-full bg-[var(--primary-color)]',
    'px-2.5 py-1 text-xs font-bold uppercase text-[#111]',
  ].join(' '),
  title: 'mt-2 text-2xl font-semibold text-white',
  meta: 'text-sm text-white/80',
};

function HeroBanner({ item }) {
    const navigate = useNavigate();

    if (!item) return null;

    return (
        <section className={styles.banner} onClick={() => navigate(`/media/${item.id}`)}>
            <img
                className={styles.image}
                src={item.coverUrl || 'https://placehold.co/1200x500?text=No+Image'}
                alt={item.title}
            />
            <div className={styles.overlay}>
                <span className={styles.pill}>Trending</span>
                <h1 className={styles.title}>{item.title}</h1>
                <p className={styles.meta}>
                  {item.releaseYear ?? 'Unknown year'} · {item.averageRating?.toFixed?.(1) ?? 'N/A'}
                </p>
            </div>
        </section>
    );
}

export default HeroBanner;
