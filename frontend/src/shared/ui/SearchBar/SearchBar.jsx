import { useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';

const styles = {
  form: [
    'flex items-center gap-2 rounded-lg border border-[var(--search-border)]',
    'bg-[var(--search-bg)] px-3 py-2 transition lg:px-4 lg:py-2.5',
    'min-w-[160px] sm:min-w-[200px] md:min-w-[240px] lg:min-w-[280px]',
    'focus-within:border-[var(--primary-color)]',
    'focus-within:shadow-[0_0_0_3px_var(--primary-color-alpha)]',
  ].join(' '),
  iconButton: [
    'flex shrink-0 items-center justify-center text-[var(--text-secondary)] transition',
    'group-focus-within:text-[var(--primary-color)] hover:text-[var(--primary-color)]',
  ].join(' '),
  input: [
    'flex-1 border-0 bg-transparent text-sm text-[var(--text-primary)] outline-none lg:text-base',
    'placeholder:text-[var(--text-secondary)]',
  ].join(' '),
};

const SearchBar = ({ onSearchComplete }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const searchValue = location.pathname === '/media' ? (searchParams.get('search') ?? '') : '';
  const inputKey = useMemo(
    () => `${location.pathname}?${searchParams.toString()}`,
    [location.pathname, searchParams],
  );

  const handleSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = String(formData.get('search') ?? '').trim();
    navigate(query ? `/media?search=${encodeURIComponent(query)}` : '/media');
    onSearchComplete?.();
  };

  return (
    <form className={`group ${styles.form}`} onSubmit={handleSearch}>
      <button
        type="submit"
        className={styles.iconButton}
        aria-label="Search media"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </button>
      <input
        type="text"
        name="search"
        key={inputKey}
        className={styles.input}
        placeholder={t('header.search.placeholder')}
        defaultValue={searchValue}
        aria-label={t('header.search.placeholder')}
      />
    </form>
  );
};

export default SearchBar;
