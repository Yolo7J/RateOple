import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useLanguage } from '../../../hooks/useLanguage';

const styles = {
  wrapper: 'relative',
  button: [
    'flex items-center gap-2 rounded-lg border border-[var(--button-border)]',
    'bg-[var(--button-bg)] px-3 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] hover:border-[var(--primary-color)] hover:-translate-y-0.5',
  ].join(' '),
  icon: 'transition group-hover:rotate-12',
  dropdown: [
    'absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-[150px] md:min-w-[180px]',
    'overflow-hidden rounded-lg border border-[var(--dropdown-border)] bg-[var(--dropdown-bg)]',
    'shadow-[0_4px_12px_var(--shadow-color)]',
  ].join(' '),
  option: [
    'flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[var(--text-primary)]',
    'transition hover:bg-[var(--dropdown-hover-bg)]',
  ].join(' '),
  optionActive: 'bg-[var(--primary-color-alpha)] text-[var(--primary-color)] font-medium',
  flag: 'text-lg',
  label: 'flex-1',
  check: 'text-[var(--primary-color)]',
};

const LanguageToggle = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, switchLanguage, t } = useLanguage();
  const dropdownRef = useRef(null);

  const languages = [
    { code: 'en', label: t('header.language.english'), flag: '🇬🇧' },
    { code: 'bg', label: t('header.language.bulgarian'), flag: '🇧🇬' },
  ];

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
    <div className={styles.wrapper} ref={dropdownRef}>
      <button
        className={`group ${styles.button}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('header.language.toggle')}
        aria-expanded={isOpen}
      >
        <svg
          className={styles.icon}
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
        <span>{language.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={clsx(styles.option, language === lang.code && styles.optionActive)}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <span className={styles.flag}>{lang.flag}</span>
              <span className={styles.label}>{lang.label}</span>
              {language === lang.code && (
                <svg
                  className={styles.check}
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
