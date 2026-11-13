import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import hi from './locales/hi.json';
import kn from './locales/kn.json';
import ta from './locales/ta.json';
import te from './locales/te.json';
import bn from './locales/bn.json';
import mr from './locales/mr.json';
import gu from './locales/gu.json';
import ml from './locales/ml.json';
import pa from './locales/pa.json';
import or_ from './locales/or.json';
import as_ from './locales/as.json';

const LANGUAGE_STORAGE_KEY = 'finsaathi_language';

// Load persisted language on startup
async function initLanguage() {
    try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLang && i18n.language !== savedLang) {
            await i18n.changeLanguage(savedLang);
        }
    } catch (err) {
        console.warn('[i18n] Failed to load saved language:', err);
    }
}

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        hi: { translation: hi },
        kn: { translation: kn },
        ta: { translation: ta },
        te: { translation: te },
        bn: { translation: bn },
        mr: { translation: mr },
        gu: { translation: gu },
        ml: { translation: ml },
        pa: { translation: pa },
        or: { translation: or_ },
        as: { translation: as_ },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false,
    },
});

// Persist language changes to AsyncStorage
i18n.on('languageChanged', async (lang) => {
    try {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (err) {
        console.warn('[i18n] Failed to persist language:', err);
    }
});

// Init: load saved language
initLanguage();

export default i18n;
