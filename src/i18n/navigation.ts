import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware replacements for next/link, next/navigation's router and
 * usePathname — every in-scope component must import these instead of the
 * plain next/* versions, or a link would silently drop the current locale
 * prefix and bounce the visitor back to French.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
