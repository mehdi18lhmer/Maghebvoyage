import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MarketplaceBrowser } from "@/components/trips/marketplace-browser";
import { localeAlternates } from "@/i18n/alternates";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/voyages">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "VoyagesPage" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `/${locale}/voyages`, languages: localeAlternates("/voyages") },
    openGraph: { title: `${t("title")} | MaghrebVoyage`, description: t("description"), url: `/${locale}/voyages` },
  };
}

export default async function MarketplacePage({ params }: PageProps<"/[locale]/voyages">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "VoyagesPage" });
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Suspense>
        <MarketplaceBrowser />
      </Suspense>
    </div>
  );
}
