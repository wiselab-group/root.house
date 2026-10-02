import { getFormatter, getTranslations } from "next-intl/server";
import type { AdminUserRow } from "@/domain/admin/admin.repository";
import { isAdminEmail } from "@/domain/admin/admin-access";
import { AdminCell, AdminTable } from "./admin-table";
import { DeleteAccountButton } from "./delete-account-button";

export async function AdminUsersTable({
  users,
  limit,
}: {
  users: AdminUserRow[];
  /** The query's cap — a full page means there may be more. */
  limit: number;
}) {
  const t = await getTranslations("admin");
  const format = await getFormatter();
  const date = (value: Date | null) =>
    value ? format.dateTime(value, "long") : t("never");

  return (
    <AdminTable
      id="admin-users"
      title={t("users.title")}
      caption={t("users.caption")}
      footnote={
        users.length >= limit ? t("truncated", { count: limit }) : undefined
      }
      head={[
        t("users.email"),
        t("users.registered"),
        t("users.lastSignIn"),
        t("users.lastActivity"),
        t("users.methods"),
        t("users.families"),
        t("users.actions"),
      ]}
    >
      {users.map((user) => (
        <tr key={user.id}>
          <AdminCell first>{user.email}</AdminCell>
          <AdminCell muted>{date(user.createdAt)}</AdminCell>
          <AdminCell muted>{date(user.lastSignInAt)}</AdminCell>
          <AdminCell muted>{date(user.lastActivityAt)}</AdminCell>
          <AdminCell muted>
            {[
              user.hasPassword && t("users.password"),
              user.hasGoogle && t("users.google"),
            ]
              .filter(Boolean)
              .join(" · ") || t("never")}
          </AdminCell>
          <AdminCell>{format.number(user.families)}</AdminCell>
          <AdminCell muted>
            {isAdminEmail(user.email) ? (
              <span title={t("delete.protected")}>{t("never")}</span>
            ) : (
              <DeleteAccountButton
                userId={user.id}
                email={user.email}
                familiesToDelete={user.familiesToDelete}
                sharedFamiliesToDelete={user.sharedFamiliesToDelete}
              />
            )}
          </AdminCell>
        </tr>
      ))}
    </AdminTable>
  );
}
