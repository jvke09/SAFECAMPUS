import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fil from './locales/fil.json';

const LANGUAGE_STORAGE_KEY = 'safepath_language';

// Get stored language or detect browser language
const getDefaultLanguage = (): string => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && ['en', 'fil'].includes(stored)) {
        return stored;
    }

    // Detect browser language
    const browserLang = navigator.language.split('-')[0];
    return browserLang === 'fil' || browserLang === 'tl' ? 'fil' : 'en';
};

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            fil: { translation: fil }
        },
        lng: getDefaultLanguage(),
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // React already escapes values
        }
    });

// Helper to change language and persist
export const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
};

// Get current language
export const getCurrentLanguage = () => i18n.language;

// Available languages
export const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'fil', name: 'Filipino', nativeName: 'Filipino' }
];

export default i18n;
