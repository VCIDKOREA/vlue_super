/**
 * Cloudflare Email Routing Worker — 1:1 포워딩
 * Secrets: VLUE_INBOUND_WEBHOOK_URL, VLUE_OFFICE_EMAIL_WEBHOOK_SECRET
 */
export default {
  async email(message, env) {
    const to = message.to;
    const from = message.from;
    const subject = message.headers.get("subject") || "";
    const text = await new Response(message.raw).text();

    const webhookUrl = env.VLUE_INBOUND_WEBHOOK_URL;
    const secret = env.VLUE_OFFICE_EMAIL_WEBHOOK_SECRET;
    if (!webhookUrl) {
      console.error("VLUE_INBOUND_WEBHOOK_URL missing");
      return;
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VLUE-Email-Webhook-Secret": secret || ""
      },
      body: JSON.stringify({
        to,
        from,
        subject,
        text
      })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("inbound webhook failed", res.status, data);
      return;
    }

    const forwardTo = data.forwardedTo;
    if (forwardTo) {
      await message.forward(forwardTo);
    }
  }
};
