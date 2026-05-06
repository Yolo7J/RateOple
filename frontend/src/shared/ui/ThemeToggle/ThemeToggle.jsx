import clsx from 'clsx';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';
import { useLanguage } from '../../../hooks/useLanguage';

const ThemeToggle = ({ className, showLabel = false }) => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const Icon = isDark ? Moon : Sun;
  const currentLabel = isDark ? t('header.theme.dark') : t('header.theme.light');
  const nextLabel = isDark ? t('header.theme.light') : t('header.theme.dark');

  return (
    <button
      type="button"
      className={clsx('theme-toggle-control', showLabel && 'theme-toggle-control-labeled', className)}
      onClick={toggleTheme}
      aria-label={`${currentLabel}. Switch to ${nextLabel}.`}
      title={`${currentLabel}. Switch to ${nextLabel}.`}
    >
      <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
      {showLabel ? <span>{currentLabel}</span> : null}
    </button>
  );
};

export default ThemeToggle;
