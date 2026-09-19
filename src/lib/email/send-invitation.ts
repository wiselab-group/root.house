import { Resend } from "resend";
import type { FamilyRole } from "@/domain/family/roles";
import { ROLE_LABELS } from "@/domain/family/role-labels";

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface SendInvitationEmailInput {
  to: string;
  familyName: string;
  /** Empty string if the inviting user has no `name` set — the greeting
   *  line falls back to a name-less phrasing rather than showing "". */
  inviterName: string;
  role: FamilyRole;
  inviteUrl: string;
}

/**
 * Sends the invitation email via Resend — BEST EFFORT, never throws. The
 * invite link is always shown in the UI as a copyable fallback regardless of
 * whether this succeeds (see the Members settings invite form), so a
 * missing RESEND_API_KEY or a transient Resend outage never blocks the
 * invite feature from working end-to-end.
 */
export async function sendInvitationEmail(
  input: SendInvitationEmailInput,
): Promise<{ sent: boolean }> {
  if (!resendClient) {
    return { sent: false };
  }

  try {
    await resendClient.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "Root house <noreply@root.house>",
      to: input.to,
      subject: `Приглашение в семейный архив «${input.familyName}»`,
      html: renderInvitationEmailHtml(input),
    });
    return { sent: true };
  } catch {
    // Best-effort — swallow. The UI's copyable link is the guaranteed path.
    return { sent: false };
  }
}

/**
 * Colors below are hex snapshots of globals.css's light-theme OKLCH tokens
 * (--background/--card/--primary/--muted/--border) — email clients don't
 * support oklch(), and dark-mode media queries are unreliable across clients,
 * so this is deliberately fixed to the light theme rather than following the
 * app's light/dark tokens. Keep in sync by eye if those tokens are recalibrated.
 */
function renderInvitationEmailHtml(input: SendInvitationEmailInput): string {
  const familyName = escapeHtml(input.familyName);
  const roleLabel = escapeHtml(ROLE_LABELS[input.role]);
  const inviteUrl = escapeHtml(input.inviteUrl);
  const greeting = input.inviterName
    ? `<strong>${escapeHtml(input.inviterName)}</strong> приглашает вас присоединиться к архиву своей семьи на Root house — общему дереву, историям и фотографиям.`
    : `Вас пригласили присоединиться к семейному архиву на Root house — общему дереву, историям и фотографиям.`;

  return `
<!doctype html>
<html lang="ru">
  <body style="margin:0;padding:48px 20px;background:#fef9f5;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
      <tr>
        <td style="background:#fffdf9;border:1px solid #e1d9d3;border-radius:20px;padding:52px 48px 44px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background:rgba(178,81,30,0.1);border-radius:8px;width:32px;height:32px;text-align:center;vertical-align:middle;">
                      <img src="${escapeHtml(iconDataUri)}" width="18" height="18" alt="" style="display:inline-block;vertical-align:middle;" />
                    </td>
                    <td style="padding-left:8px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:500;color:#312620;">
                      Root house
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:25px;font-weight:600;line-height:1.3;text-align:center;margin:0 0 12px;color:#312620;">
            Вас пригласили в семейный архив
          </h1>
          <p style="font-size:15px;line-height:1.65;color:#655c56;text-align:center;max-width:44ch;margin:0 auto 36px;">
            ${greeting}
          </p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7eee9;border:1px solid #e1d9d3;border-radius:14px;margin-bottom:30px;">
            <tr>
              <td style="padding:26px 28px 24px;text-align:center;">
                <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#312620;margin-bottom:14px;">
                  ${familyName}
                </div>
                <span style="display:inline-block;font-size:12.5px;font-weight:600;color:#b2511e;background:rgba(178,81,30,0.1);border-radius:999px;padding:6px 14px;">
                  Роль: ${roleLabel}
                </span>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:22px;">
            <tr>
              <td>
                <a href="${inviteUrl}" style="display:block;text-align:center;background:#b2511e;color:#fefbf8;font-size:15px;font-weight:600;text-decoration:none;border-radius:11px;padding:14px 20px;">
                  Присоединиться к семье
                </a>
              </td>
            </tr>
          </table>

          <p style="font-size:12.5px;color:#655c56;opacity:0.85;text-align:center;line-height:1.6;word-break:break-all;margin:0 0 30px;">
            Если кнопка не работает, скопируйте ссылку:<br />
            <a href="${inviteUrl}" style="color:inherit;">${inviteUrl}</a>
          </p>

          <hr style="border:none;border-top:1px solid #e1d9d3;margin:0 0 22px;" />

          <p style="font-size:13px;line-height:1.7;color:#655c56;text-align:center;max-width:42ch;margin:0 auto;">
            Ссылка действительна 7 дней. Если вы не ожидали этого письма — просто проигнорируйте его, доступ никому не будет открыт.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding-top:20px;text-align:center;font-size:12.5px;color:#655c56;opacity:0.8;">
          Root house — семейный архив, который остаётся с вами
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Inlined lucide "house" glyph (same path as BrandMark's icon), terracotta
 *  stroke — data URI so it renders without relying on remote asset hosting
 *  in email clients that block external images by default. */
const iconDataUri =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#b2511e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  );

function escapeHtml(value: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (c) => map[c]!);
}
