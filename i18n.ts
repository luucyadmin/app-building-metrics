import de from "./i18n/de";
import en from "./i18n/en";

const i18n = Object.keys(en).reduce((acc, key) => {
  acc[key] = en[key].translate.german(de[key]);
  return acc;
}, {} as typeof en);

export default i18n;