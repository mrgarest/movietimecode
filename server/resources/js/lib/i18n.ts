import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import uk from "../../../lang/uk.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      uk: { translation: uk },
    },
    fallbackLng: "uk",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['navigator'],
    }
  });

export default i18n;
