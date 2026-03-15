import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';

const styles = {
  wrapper: 'relative',
  button: [
    'flex items-center gap-2 rounded-lg border border-[var(--button-border)]',
    'bg-[var(--button-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] hover:border-[var(--primary-color)] hover:-translate-y-0.5',
  ].join(' '),
  icon: 'h-5 w-5 transition group-hover:scale-110',
  menu: [
    'absolute left-0 top-[calc(100%+0.5rem)] z-50 min-w-[180px] md:min-w-[200px]',
    'overflow-hidden rounded-lg border border-[var(--dropdown-border)] bg-[var(--dropdown-bg)]',
    'shadow-[0_4px_12px_var(--shadow-color)]',
  ].join(' '),
  item: [
    'flex w-full items-center justify-between px-4 py-3 text-left text-sm',
    'text-[var(--text-primary)] transition hover:bg-[var(--dropdown-hover-bg)]',
  ].join(' '),
  submenu: 'border-t border-[var(--dropdown-border)] bg-[var(--submenu-bg)]',
  subitem: [
    'block w-full px-6 py-2.5 text-left text-sm text-[var(--text-secondary)]',
    'transition hover:bg-[var(--dropdown-hover-bg)] hover:text-[var(--text-primary)]',
  ].join(' '),
};

const NavigationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMediaOpen, setIsMediaOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { t } = useLanguage();
  const navigate = useNavigate();

  const navigationItems = [
    { label: t('header.navigation.home'), path: '/' },
    {
      label: t('header.navigation.media'),
      path: '/media',
      subItems: [
        { label: t('header.navigation.movies'), path: '/media?types=Movie' },
        { label: t('header.navigation.books'), path: '/media?types=Book' },
        { label: t('header.navigation.tvShows'), path: '/media?types=TvSeries' },
      ],
    },
    { label: 'Collections', path: '/collections' },
    { label: 'Groups', path: '/groups' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsMediaOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false);
    setIsMediaOpen(false);
  };

  const toggleMediaSubmenu = (e) => {
    e.stopPropagation();
    setIsMediaOpen((prev) => !prev);
  };

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      <button
        className={`group ${styles.button}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t('header.navigation.menu')}
        aria-expanded={isOpen}
      >
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        <span>{t('header.navigation.menu')}</span>
      </button>

      {isOpen && (
        <div className={styles.menu}>
          {navigationItems.map((item) => (
            <div key={item.label}>
              <button
                className={styles.item}
                onClick={(e) => (item.subItems ? toggleMediaSubmenu(e) : handleNavigation(item.path))}
              >
                <span>{item.label}</span>
                {item.subItems ? (
                  <svg
                    className={clsx('h-4 w-4 transition', isMediaOpen && 'rotate-180')}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                ) : null}
              </button>

              {item.subItems && isMediaOpen ? (
                <div className={styles.submenu}>
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.path}
                      className={styles.subitem}
                      onClick={() => handleNavigation(subItem.path)}
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NavigationDropdown;
