import type { Metadata } from "next";
import { CreateFamilyForm } from "@/components/forms/create-family-form";
import { SetBreadcrumbs } from "@/components/breadcrumbs-context";

export const metadata: Metadata = {
  title: "Новая семья",
};

export default function NewFamilyPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-8 px-6 py-12 sm:py-16">
      <SetBreadcrumbs
        items={[
          { label: "Мои семьи", href: "/families" },
          { label: "Новая семья" },
        ]}
      />
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-medium tracking-tight text-balance">
          Новая семья
        </h1>
        <p className="text-muted-foreground">
          Это станет отдельным архивом — людей, события и фото можно будет
          пригласить редактировать родственникам позже.
        </p>
      </div>
      <CreateFamilyForm />
    </main>
  );
}
