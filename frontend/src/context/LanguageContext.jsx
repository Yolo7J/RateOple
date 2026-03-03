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
        const savedLanguage = localStorage.getItem('language');
        return savedLanguage || 'en';
    });

    useEffect(() => {
        localStorage.setItem('language', language);
        document.documentElement.setAttribute('lang', language);
    }, [language]);

    const switchLanguage = (lang) => {
        if (translations[lang]) {
            setLanguage(lang);
        }
    };

    // Translation function with dot-notation lookup and optional variable interpolation
    // Usage: t('header.auth.hello', { username: 'John' })
    // Replaces {{username}} in the translation string with the provided value
    const t = (key, vars) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            value = value?.[k];
        }

        if (!value) return key;

        if (vars) {
            return Object.entries(vars).reduce(
                (str, [k, v]) => str.replace(new RegExp(`{{${k}}}`, 'g'), v),
                value
            );
        }

        return value;
    };

    return (
        <LanguageContext.Provider value={{ language, switchLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};