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
