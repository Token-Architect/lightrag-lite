import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useSettingsStore } from '@/stores/settings'

import en from './locales/en.json'
import zh from './locales/zh.json'
import fr from './locales/fr.json'
import ar from './locales/ar.json'
import zh_TW from './locales/zh_TW.json'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      fr: { translation: fr },
      ar: { translation: ar },
      zh_TW: { translation: zh_TW }
    },
    // Force Chinese UI to avoid mixed-language rendering.
    lng: 'zh',
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false
    },
    // Configuration to handle missing translations
    returnEmptyString: false,
    returnNull: false,
  })

// Keep i18n language fixed to Chinese even if persisted state has old values.
useSettingsStore.subscribe((state) => {
  if (state.language !== 'zh' || i18n.language !== 'zh') {
    i18n.changeLanguage('zh')
  }
})

export default i18n
