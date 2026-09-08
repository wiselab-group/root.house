import { Resend } from "resend";

const resendClient = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export interface SendInvitationEmailInput {
  to: string;
  familyName: string;
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
      from: process.env.RESEND_FROM_EMAIL ?? "Root House <noreply@root.house>",
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

function renderInvitationEmailHtml(input: SendInvitationEmailInput): string {
  return `
    <p>Вас пригласили присоединиться к семейному архиву «${escapeHtml(input.familyName)}» в Root House.</p>
    <p><a href="${input.inviteUrl}">Присоединиться к семье</a></p>
    <p>Если вы не ожидали этого письма, просто проигнорируйте его.</p>
  `;
}

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
