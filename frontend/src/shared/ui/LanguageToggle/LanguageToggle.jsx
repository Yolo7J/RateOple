import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../../hooks/useLanguage';
import './LanguageToggle.css';

const LanguageToggle = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { language, switchLanguage, t } = useLanguage();
    const dropdownRef = useRef(null);

    const languages = [
        { code: 'en', label: t('header.language.english'), flag: '🇬🇧' },
        { code: 'bg', label: t('header.language.bulgarian'), flag: '🇧🇬' }
    ];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleLanguageChange = (langCode) => {
        switchLanguage(langCode);
        setIsOpen(false);
    };

    return (
        <div className="language-toggle" ref={dropdownRef}>
            <button
                className="language-toggle-button"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={t('header.language.toggle')}
                aria-expanded={isOpen}
            >
                <svg
                    className="globe-icon"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <span className="current-language">{language.toUpperCase()}</span>
            </button>

            {isOpen && (
                <div className="language-dropdown">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            className={`language-option ${language === lang.code ? 'active' : ''}`}
                            onClick={() => handleLanguageChange(lang.code)}
                        >
                            <span className="language-flag">{lang.flag}</span>
                            <span className="language-label">{lang.label}</span>
                            {language === lang.code && (
                                <svg
                                    className="check-icon"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                >
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default LanguageToggle;
