import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronDown, Film, LayoutGrid, Tv } from 'lucide-react';
import { useLanguage } from '../../../hooks/useLanguage';

const NavigationDropdown = ({ className, label, path, items, active = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const resolvedLabel = label ?? t('header.navigation.media');
  const resolvedPath = path ?? '/media';
  const resolvedItems =
    items ??
    [
      { label: 'All Media', path: '/media', icon: LayoutGrid },
      { label: t('header.navigation.movies'), path: '/media?types=Movie', icon: Film },
      { label: t('header.navigation.tvShows'), path: '/media?types=TvSeries', icon: Tv },
      { label: t('header.navigation.books'), path: '/media?types=Book', icon: BookOpen },
    ];
  const isActive = active || location.pathname === resolvedPath;

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

  const handleNavigate = (target) => {
    navigate(target);
    setIsOpen(false);
  };

  return (
    <div className={clsx('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        className={clsx('nav-pill gap-2', isActive && 'nav-pill-active')}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={resolvedLabel}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-current={isActive ? 'page' : undefined}
      >
        <span>{resolvedLabel}</span>
        <ChevronDown
          className={clsx('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-180')}
          strokeWidth={2.4}
          aria-hidden="true"
        />
      </button>

      {isOpen ? (
        <div className="nav-dropdown-panel" role="menu">
          {resolvedItems.map((item) => {
            const Icon = item.icon;
            const itemActive = location.pathname === item.path.split('?')[0] && item.path === resolvedPath;

            return (
              <button
                key={item.path}
                type="button"
                className={clsx('nav-dropdown-item', itemActive && 'nav-dropdown-item-active')}
                onClick={() => handleNavigate(item.path)}
                role="menuitem"
              >
                {Icon ? (
                  <span className="desktop-menu-icon" aria-hidden="true">
                    <Icon className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                ) : null}
                <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default NavigationDropdown;
