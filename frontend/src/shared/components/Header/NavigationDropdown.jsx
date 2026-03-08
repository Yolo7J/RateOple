import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../hooks/useLanguage';
import './NavigationDropdown.css';

const NavigationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMediaOpen, setIsMediaOpen] = useState(false);
    const dropdownRef = useRef(null);
    const { t } = useLanguage();
    const navigate = useNavigate();

    const navigationItems = [
        {
            label: t('header.navigation.home'),
            path: '/',
        },
        {
            label: t('header.navigation.media'),
            path: '/media',
            subItems: [
                { label: t('header.navigation.movies'), path: '/media?types=Movie' },
                { label: t('header.navigation.books'),  path: '/media?types=Book' },
                { label: t('header.navigation.tvShows'), path: '/media?types=TvSeries' },
            ],
        },
        {
            label: 'Collections',
            path: '/collections',
        },
    ];

    // Close dropdown when clicking outside
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
        setIsMediaOpen(prev => !prev);
    };

    return (
        <div className="navigation-dropdown" ref={dropdownRef}>
            <button
                className="nav-dropdown-button"
                onClick={() => setIsOpen(prev => !prev)}
                aria-label={t('header.navigation.menu')}
                aria-expanded={isOpen}
            >
                <svg className="menu-icon" viewBox="0 0 24 24">
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
                <span className="menu-label">{t('header.navigation.menu')}</span>
            </button>

            {isOpen && (
                <div className="nav-dropdown-menu">
                    {navigationItems.map((item, index) => (
                        <div key={index} className="nav-item-wrapper">
                            <button
                                className="nav-item"
                                onClick={(e) =>
                                    item.subItems
                                        ? toggleMediaSubmenu(e)
                                        : handleNavigation(item.path)
                                }
                            >
                                <span>{item.label}</span>
                                {item.subItems && (
                                    <svg
                                        className={`chevron-icon ${isMediaOpen ? 'open' : ''}`}
                                        viewBox="0 0 24 24"
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                )}
                            </button>

                            {item.subItems && isMediaOpen && (
                                <div className="nav-submenu">
                                    {item.subItems.map((subItem, subIndex) => (
                                        <button
                                            key={subIndex}
                                            className="nav-subitem"
                                            onClick={() => handleNavigation(subItem.path)}
                                        >
                                            {subItem.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NavigationDropdown;
