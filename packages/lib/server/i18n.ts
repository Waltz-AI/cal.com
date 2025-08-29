import * as fs from "fs";
import { createInstance } from "i18next";
import * as path from "path";

const translationCache = new Map<string, Record<string, string>>();
const i18nInstanceCache = new Map<string, any>();

/**
 * Gets the path to translation files
 * @returns {string} Path to the locales directory
 */
function getLocalesPath(): string {
  // Try to find the locales directory relative to the current file
  const possiblePaths = [
    // For v2 API running from apps/api/v2
    path.resolve(process.cwd(), "../../apps/web/public/static/locales"),
    // For web app running from apps/web
    path.resolve(process.cwd(), "public/static/locales"),
    // For packages running from packages/lib
    path.resolve(process.cwd(), "../../apps/web/public/static/locales"),
    // For packages running from packages/platform
    path.resolve(process.cwd(), "../../../apps/web/public/static/locales"),
    // Fallback to a common path
    path.resolve(process.cwd(), "apps/web/public/static/locales"),
    // For Docker or different working directories
    path.resolve(process.cwd(), "public/static/locales"),
    path.resolve(process.cwd(), "static/locales"),
  ];

  for (const localesPath of possiblePaths) {
    if (fs.existsSync(localesPath)) {
      console.log(`Found locales directory at: ${localesPath}`);
      return localesPath;
    }
  }

  // If no path found, return the default web app path
  const defaultPath = path.resolve(process.cwd(), "apps/web/public/static/locales");
  console.warn(`No locales directory found, using default path: ${defaultPath}`);
  return defaultPath;
}

/**
 * Loads English fallback translations from file system
 * @returns {Promise<Record<string, string>>} English translations object or empty object on failure
 */
async function loadFallbackTranslations(): Promise<Record<string, string>> {
  const cacheKey = "en-common";

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey) || {};
  }

  try {
    const localesPath = getLocalesPath();
    const fallbackPath = path.join(localesPath, "en", "common.json");

    if (!fs.existsSync(fallbackPath)) {
      console.warn(`Fallback translation file not found at: ${fallbackPath}`);
      console.warn(`Available paths checked: ${getLocalesPath()}`);
      return {};
    }

    const fileContent = fs.readFileSync(fallbackPath, "utf-8");
    const translations = JSON.parse(fileContent);
    translationCache.set(cacheKey, translations);
    console.log(`Loaded fallback translations from: ${fallbackPath}`);
    return translations;
  } catch (error) {
    console.error("Could not load fallback translations from file system:", error);
    return {};
  }
}

/**
 * Loads translations for a specific locale and namespace from file system with optimized caching
 * @param {string} _locale - The locale code (e.g., 'en', 'fr', 'zh')
 * @param {string} ns - The namespace for the translations
 * @returns {Promise<Record<string, string>>} Translations object or fallback translations on failure
 */
export async function loadTranslations(_locale: string, ns: string): Promise<Record<string, string>> {
  const locale = _locale === "zh" ? "zh-CN" : _locale;
  const cacheKey = `${locale}-${ns}`;

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey) || {};
  }

  try {
    const localesPath = getLocalesPath();
    const translationPath = path.join(localesPath, locale, `${ns}.json`);

    if (!fs.existsSync(translationPath)) {
      console.warn(`Translation file not found at: ${translationPath}, falling back to English`);
      const fallbackTranslations = await loadFallbackTranslations();
      return fallbackTranslations;
    }

    const fileContent = fs.readFileSync(translationPath, "utf-8");
    const translations = JSON.parse(fileContent);
    translationCache.set(cacheKey, translations);
    console.log(`Loaded translations for ${locale}/${ns} from: ${translationPath}`);
    return translations;
  } catch (error) {
    console.warn(
      `Failed to load translations for ${locale}/${ns} from file system, falling back to English:`,
      error
    );
    const fallbackTranslations = await loadFallbackTranslations();
    return fallbackTranslations;
  }
}

/**
 * Creates or retrieves a cached i18next translation function for the specified locale and namespace
 * @param {string} locale - The locale code (e.g., 'en', 'fr')
 * @param {string} ns - The namespace for the translations
 * @returns {Promise<Function>} A translation function bound to the specified locale and namespace
 */
export const getTranslation = async (locale: string, ns: string) => {
  const cacheKey = `${locale}-${ns}`;
  if (i18nInstanceCache.has(cacheKey)) {
    return i18nInstanceCache.get(cacheKey).getFixedT(locale, ns);
  }

  const resources = await loadTranslations(locale, ns);

  const _i18n = createInstance();
  _i18n.init({
    lng: locale,
    resources: {
      [locale]: {
        [ns]: resources,
      },
    },
    fallbackLng: "en",
  });

  // Cache the i18n instance
  i18nInstanceCache.set(cacheKey, _i18n);
  return _i18n.getFixedT(locale, ns);
};
