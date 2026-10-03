import "server-only";
import { en } from "@/content/en";
import { ur } from "@/content/ur";

const dictionaries = { en, ur };

export type Locale = keyof typeof dictionaries;
export const locales: Locale[] = ["en", "ur"];

export const hasLocale = (locale: string): locale is Locale => locale in dictionaries;

export const getDictionary = (locale: Locale) => dictionaries[locale];
