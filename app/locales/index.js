import { en } from "./en";
import { fr } from "./fr";

const LOCALES = {
  en,
  fr,
};

function extractLocaleCandidates(request) {
  const headers = request.headers;
  const sources = [
    headers.get("x-shopify-locale"),
    headers.get("x-shopify-shop-locale"),
    headers.get("shopify-locale"),
    headers.get("accept-language"),
  ].filter(Boolean);

  return sources
    .flatMap((value) => String(value).split(","))
    .map((value) => value.split(";")[0].trim().toLowerCase())
    .filter(Boolean);
}

function normalizeLanguage(value) {
  const base = String(value || "").toLowerCase().split("-")[0];
  if (base === "fr") {
    return "fr";
  }
  if (base === "en") {
    return "en";
  }
  return null;
}

export function detectLanguage(request) {
  const candidates = extractLocaleCandidates(request);
  for (const candidate of candidates) {
    const normalized = normalizeLanguage(candidate);
    if (normalized && LOCALES[normalized]) {
      return normalized;
    }
  }

  return "en";
}

export function getLocale(request) {
  const lang = detectLanguage(request);
  return {
    lang,
    messages: LOCALES[lang] || en,
  };
}
