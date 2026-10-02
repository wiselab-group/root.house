import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin-guard";
import {
  getAdminSummary,
  listAdminFamilies,
  listAdminUsers,
} from "@/domain/admin/admin.repository";
import { AdminSummary } from "@/components/admin/admin-summary";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { AdminFamiliesTable } from "@/components/admin/admin-families-table";

const ROW_LIMIT = 500;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

/**
 * Service overview for the Root house team: headline numbers, every user,
 * every family by storage. Read-only, metadata only — what the team may see
 * is fixed by /privacy and enforced in admin.repository.
 */
export default async function AdminPage() {
  await requireAdmin();
  const t = await getTranslations("admin");
  const [summary, users, families] = await Promise.all([
    getAdminSummary(),
    listAdminUsers(ROW_LIMIT),
    listAdminFamilies(ROW_LIMIT),
  ]);

  return (
    <main className="dark photo-backdrop min-h-svh">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 pt-14 pb-20 sm:px-8 sm:pt-20">
        <header className="flex flex-col gap-3">
          <h1 className="font-heading text-display-lg leading-[1.05] font-medium tracking-tight text-balance">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-muted-foreground">{t("lead")}</p>
        </header>
        <AdminSummary summary={summary} />
        <AdminUsersTable users={users} limit={ROW_LIMIT} />
        <AdminFamiliesTable families={families} limit={ROW_LIMIT} />
      </div>
    </main>
  );
}
