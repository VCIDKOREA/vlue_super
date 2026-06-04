import { Hono } from "hono";
import { requireUserHeader } from "../middleware/cardGate.js";
import { getOrCreateMailAccount, sendMailFromAccount } from "../services/mail/mailService.js";
import { insertOfficeEmailSent } from "../services/office/officeEmailSent.js";

export const mailRoutes = new Hono();
mailRoutes.use("*", requireUserHeader);

mailRoutes.post("/accounts/provision", async (c) => {
  const userId = c.get("vlueUserId") as string;
  const body = (await c.req.json<{ localPartHint?: string }>().catch(() => ({}))) as { localPartHint?: string };
  const account = getOrCreateMailAccount(userId, body?.localPartHint);
  return c.json({ ok: true, account });
});

mailRoutes.post("/send", async (c) => {
  const userId = c.get("vlueUserId") as string;
  try {
    const body = await c.req.json<{
      accountId?: string;
      to?: string;
      subject?: string;
      text?: string;
      attachmentAssetIds?: string[];
    }>();
    const accountId = String(body.accountId || "");
    if (!accountId) return c.json({ error: "accountId is required" }, 400);
    const to = String(body.to || "");
    const subject = String(body.subject || "(no subject)");
    const account = getOrCreateMailAccount(userId);
    const useAccountId = accountId || account.id;
    try {
      const msg = await sendMailFromAccount({
        accountId: useAccountId,
        to,
        subject,
        text: body.text,
        attachmentAssetIds: body.attachmentAssetIds
      });
      await insertOfficeEmailSent({
        userId,
        fromAddress: msg.from,
        toAddress: msg.to,
        subject: msg.subject,
        status: "SUCCESS"
      });
      return c.json({ ok: true, message: msg });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "send failed";
      await insertOfficeEmailSent({
        userId,
        fromAddress: account.address,
        toAddress: to,
        subject,
        status: "FAILED",
        errorMessage: errMsg
      });
      throw e;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return c.json({ error: message }, 400);
  }
});

