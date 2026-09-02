import siteData from "../data/site.json";

export type NavigationItem = {
  label: string;
  href: string;
  primary?: boolean;
};

export const site = {
  ...siteData,
  headerNavigation: siteData.headerNavigation as NavigationItem[],
  footerNavigation: siteData.footerNavigation as NavigationItem[],
};

export const currentYear = new Date().getFullYear();

// "Martes en loita" ten 16 edicións de 2025-26. A 17ª edición arrinca o
// martes 1 de setembro de 2026 (inicio de xeira), e a partir de aí súmase
// unha edición cada martes seguinte. O valor recalcúlase en cada build
// do sitio (é estático, non se actualiza en tempo real entre despregues).
const MARTES_EN_LOITA_EPOCH_EDITION = 17;
const MARTES_EN_LOITA_EPOCH_UTC = Date.UTC(2026, 8, 1); // 2026-09-01
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function computeMartesEnLoitaEdition(now: Date = new Date()): number {
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const weeksSinceEpoch = Math.floor((todayUTC - MARTES_EN_LOITA_EPOCH_UTC) / WEEK_MS);
  return MARTES_EN_LOITA_EPOCH_EDITION + Math.max(0, weeksSinceEpoch);
}

export const martesEnLoitaEdition = computeMartesEnLoitaEdition();
