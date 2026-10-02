import { getFormatter, getTranslations } from "next-intl/server";
import type { AdminFamilyRow } from "@/domain/admin/admin.repository";
import { AdminCell, AdminTable } from "./admin-table";
import { formatBytes } from "./format-bytes";

/** Families by owner email and counts — never the family's name or
 *  content (privacy boundary, see admin.repository). */
export async function AdminFamiliesTable({
  families,
  limit,
}: {
  families: AdminFamilyRow[];
  limit: number;
}) {
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const n = (value: number) => format.number(value);

  return (
    <AdminTable
      id="admin-families"
      title={t("families.title")}
      caption={t("families.caption")}
      footnote={
        families.length >= limit ? t("truncated", { count: limit }) : undefined
      }
      head={[
        t("families.owners"),
        t("families.created"),
        t("families.members"),
        t("families.persons"),
        t("families.stories"),
        t("families.files"),
        t("families.storage"),
        t("families.lastActivity"),
      ]}
    >
      {families.map((family) => (
        <tr key={family.id}>
          <AdminCell first>
            {family.ownerEmails.length > 0 ? (
              family.ownerEmails.join(", ")
            ) : (
              <span className="text-muted-foreground">
                {t("families.noOwner")}
              </span>
            )}
          </AdminCell>
          <AdminCell muted>
            {format.dateTime(family.createdAt, "long")}
          </AdminCell>
          <AdminCell>{n(family.members)}</AdminCell>
          <AdminCell>{n(family.persons)}</AdminCell>
          <AdminCell>{n(family.stories)}</AdminCell>
          <AdminCell>{n(family.mediaFiles)}</AdminCell>
          <AdminCell>
            {formatBytes(family.storageBytes, format.number)}
          </AdminCell>
          <AdminCell muted>
            {family.lastActivityAt
              ? format.dateTime(family.lastActivityAt, "long")
              : t("never")}
          </AdminCell>
        </tr>
      ))}
    </AdminTable>
  );
}
