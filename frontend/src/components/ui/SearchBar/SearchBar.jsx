import { useState } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import './SearchBar.css';

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
        <form className="search-bar" onSubmit={handleSearch}>
            <svg
                className="search-icon"
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
                className="search-input"
                placeholder={t('header.search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label={t('header.search.placeholder')}
            />
        </form>
    );
};

export default SearchBar;
