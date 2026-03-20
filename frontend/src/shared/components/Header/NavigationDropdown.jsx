import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';

const NavigationDropdown = ({ className, label, path, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const resolvedLabel = label ?? t('header.navigation.media');
  const resolvedPath = path ?? '/media';
  const resolvedItems =
    items ??
    [
      { label: t('header.navigation.movies'), path: '/media?types=Movie' },
      { label: t('header.navigation.books'), path: '/media?types=Book' },
      { label: t('header.navigation.tvShows'), path: '/media?types=TvSeries' },
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

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNavigate = (target) => {
    navigate(target);
    setIsOpen(false);
  };

  return (
    <div className={clsx('relative flex items-center gap-1', className)} ref={dropdownRef}>
      <button
        className="rounded-full px-2 py-1 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--button-hover-bg)] hover:text-[var(--text-primary)]"
        onClick={() => handleNavigate(resolvedPath)}
      >
        {resolvedLabel}
      </button>
      <button
        className="flex items-center justify-center rounded-full border border-transparent p-1 text-[var(--text-secondary)] transition hover:border-[var(--button-border)] hover:bg-[var(--button-hover-bg)] hover:text-[var(--text-primary)]"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={resolvedLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <svg
          className={clsx('h-4 w-4 transition', isOpen && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen ? (
        <div
          className="absolute left-0 top-full z-50 mt-3 w-60 overflow-hidden rounded-2xl border border-[var(--dropdown-border)] bg-[var(--dropdown-bg)] shadow-[0_18px_40px_-24px_var(--shadow-color)]"
          role="menu"
        >
          {resolvedItems.map((item) => (
            <button
              key={item.path}
              className="flex w-full items-center justify-between px-5 py-3 text-left text-base text-[var(--text-primary)] transition hover:bg-[var(--dropdown-hover-bg)]"
              onClick={() => handleNavigate(item.path)}
              role="menuitem"
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default NavigationDropdown;
