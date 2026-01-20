import { createContext, useState, useEffect } from 'react';
import enTranslations from '../locales/en.json';
import bgTranslations from '../locales/bg.json';

export const LanguageContext = createContext();

const translations = {
    en: enTranslations,
    bg: bgTranslations
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        // Check localStorage for saved language preference
        const savedLanguage = localStorage.getItem('language');
        return savedLanguage || 'en'; // Default to English
    });

    useEffect(() => {
        // Save language preference to localStorage
        localStorage.setItem('language', language);
        // Set document language attribute for accessibility
        document.documentElement.setAttribute('lang', language);
    }, [language]);

    const switchLanguage = (lang) => {
        if (translations[lang]) {
            setLanguage(lang);
        }
    };

    // Translation function with fallback
    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            value = value?.[k];
        }

        return value || key; // Return key if translation not found
    };

    return (
        <LanguageContext.Provider value={{ language, switchLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
