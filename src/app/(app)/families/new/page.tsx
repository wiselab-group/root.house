import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { CreateFamilyForm } from "@/components/forms/create-family-form";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("families");
  return { title: t("newTitle") };
}

export default function NewFamilyPage() {
  const t = useTranslations("families");
  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: t("title"), href: "/families" },
          { label: t("newTitle") },
        ]}
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-title font-medium tracking-tight text-balance">
          {t("newTitle")}
        </h1>
        <p className="text-muted-foreground">{t("newLead")}</p>
      </div>
      <CreateFamilyForm />
    </main>
  );
}
