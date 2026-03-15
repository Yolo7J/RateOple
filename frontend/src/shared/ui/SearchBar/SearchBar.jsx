import { useState } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';

const styles = {
  form: [
    'flex items-center gap-2 rounded-lg border border-[var(--search-border)]',
    'bg-[var(--search-bg)] px-3 py-2 transition',
    'min-w-[120px] sm:min-w-[150px] md:min-w-[200px]',
    'focus-within:border-[var(--primary-color)]',
    'focus-within:shadow-[0_0_0_3px_var(--primary-color-alpha)]',
  ].join(' '),
  icon: 'text-[var(--text-secondary)] transition group-focus-within:text-[var(--primary-color)]',
  input: [
    'flex-1 border-0 bg-transparent text-sm text-[var(--text-primary)] outline-none',
    'placeholder:text-[var(--text-secondary)]',
  ].join(' '),
};

const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useLanguage();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log('Searching for:', searchQuery);
    }
  };

  return (
    <form className={`group ${styles.form}`} onSubmit={handleSearch}>
      <svg
        className={styles.icon}
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        className={styles.input}
        placeholder={t('header.search.placeholder')}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        aria-label={t('header.search.placeholder')}
      />
    </form>
  );
};

export default SearchBar;
