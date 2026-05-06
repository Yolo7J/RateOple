import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
import { useLanguage } from '../../../hooks/useLanguage';

const LanguageToggle = ({ align = 'right', className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { language, switchLanguage, t } = useLanguage();
  const dropdownRef = useRef(null);

  const languages = [
    { code: 'en', label: t('header.language.english'), shortLabel: 'EN' },
    { code: 'bg', label: t('header.language.bulgarian'), shortLabel: 'BG' },
  ];
  const currentLanguage = languages.find((item) => item.code === language) ?? languages[0];

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

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleLanguageChange = (langCode) => {
    switchLanguage(langCode);
    setIsOpen(false);
  };

  return (
    <div className={clsx('language-toggle-wrap', className)} ref={dropdownRef}>
      <button
        type="button"
        className="language-toggle-control"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={t('header.language.toggle')}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Globe2 className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
        <span>{currentLanguage.shortLabel}</span>
        <ChevronDown
          className={clsx('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')}
          strokeWidth={2.4}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div className={clsx('language-menu', align === 'left' ? 'left-0' : 'right-0')} role="menu">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              className={clsx('language-menu-item', language === lang.code && 'language-menu-item-active')}
              onClick={() => handleLanguageChange(lang.code)}
              role="menuitem"
            >
              <span className="language-code">{lang.shortLabel}</span>
              <span className="min-w-0 flex-1 truncate text-left">{lang.label}</span>
              {language === lang.code ? <Check className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default LanguageToggle;
