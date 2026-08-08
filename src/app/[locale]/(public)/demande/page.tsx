import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AiPlannerClient } from "@/components/ai/ai-planner-client";
import { localeAlternates } from "@/i18n/alternates";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/demande">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AiPlanner.hero" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: `/${locale}/demande`, languages: localeAlternates("/demande") },
    openGraph: { title: `${t("title")} | MaghrebVoyage`, description: t("subtitle"), url: `/${locale}/demande` },
  };
}

export default function AiRequestPage() {
  return (
    <div className="bg-secondary/40 py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <AiPlannerClient />
      </div>
    </div>
  );
}
