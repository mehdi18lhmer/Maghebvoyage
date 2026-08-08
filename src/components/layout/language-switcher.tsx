"use client";

import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};

/**
 * Switches language while staying on the same page (`/trip/x` in French
 * becomes `/trip/x` in English, not the homepage) — `useRouter().replace`
 * from next-intl's navigation wrapper re-resolves the current pathname under
 * the new locale, including re-running any dynamic segments.
 */
export function LanguageSwitcher({ transparent = false }: { transparent?: boolean }) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "gap-1.5 rounded-lg",
            transparent ? "text-white hover:bg-white/15 hover:text-white" : "text-muted-foreground"
          )}
          aria-label={t("label")}
        >
          <Globe className="size-4" />
          <span className="uppercase">{locale}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => router.replace(pathname, { locale: l })}
            className={cn(l === locale && "font-semibold text-primary")}
          >
            {LOCALE_LABELS[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
