import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SendPushArgs = {
  orgId: string;
  locationId: string;
  notificationType: string;
  targetDate: string;
  title: string;
  body: string;
  url: string;
};

type SendPushResult = {
  sent: number;
  skipped: number;
  failed: number;
};

function configureWebPush() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:info@temptake.com";

  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID keys.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function sendPushToLocation(args: SendPushArgs): Promise<SendPushResult> {
  configureWebPush();

  const { data: subscriptions, error: subError } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id,subscription")
    .eq("org_id", args.orgId)
    .eq("enabled", true)
    .or(`location_id.is.null,location_id.eq.${args.locationId}`);

  if (subError) throw subError;

  if (!subscriptions?.length) {
    return { sent: 0, skipped: 1, failed: 0 };
  }

  const { error: logError } = await supabaseAdmin.from("notification_log").insert({
    org_id: args.orgId,
    location_id: args.locationId,
    notification_type: args.notificationType,
    target_date: args.targetDate,
  });

  if (logError) {
    return { sent: 0, skipped: 1, failed: 0 };
  }

  const payload = JSON.stringify({
    title: args.title,
    body: args.body,
    url: args.url,
  });

  let sent = 0;
  let failed = 0;

  for (const row of subscriptions as Array<{ id: string; subscription: any }>) {
    try {
      await webpush.sendNotification(row.subscription, payload);
      sent += 1;
    } catch (e: any) {
      failed += 1;

      const statusCode = Number(e?.statusCode ?? 0);

      if (statusCode === 404 || statusCode === 410) {
        await supabaseAdmin
          .from("push_subscriptions")
          .update({
            enabled: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
      }
    }
  }

  return { sent, skipped: 0, failed };
}