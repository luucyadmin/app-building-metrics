import * as de from "./i18n/de.json";
import * as en from "./i18n/en.json";

const i18n = Object.keys(en).reduce((acc, key) => {
  acc[key] = en[key].translate.german(de[key]);
  return acc;
}, {} as typeof en);

export default i18n;