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

type PushPreferenceColumn =
  | "notify_closing_signoff"
  | "notify_cleaning"
  | "notify_temp_fail"
  | "notify_training"
  | "notify_allergen";

type PushSubscriptionRow = {
  id: string;
  subscription: any;
  notify_closing_signoff: boolean | null;
  notify_cleaning: boolean | null;
  notify_temp_fail: boolean | null;
  notify_training: boolean | null;
  notify_allergen: boolean | null;
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

function getPreferenceColumn(notificationType: string): PushPreferenceColumn | null {
  if (notificationType === "closing_signoff_missing") {
    return "notify_closing_signoff";
  }

  if (notificationType === "cleaning_incomplete") {
    return "notify_cleaning";
  }

  if (notificationType === "no_temp_logs_today") {
    return "notify_temp_fail";
  }

  if (notificationType.startsWith("temperature_fail_")) {
    return "notify_temp_fail";
  }

  if (notificationType === "training_expiring_soon") {
    return "notify_training";
  }

  if (notificationType === "allergen_review_due") {
    return "notify_allergen";
  }

  return null;
}

function preferenceAllows(row: PushSubscriptionRow, column: PushPreferenceColumn | null) {
  if (!column) return true;
  return row[column] !== false;
}

export async function sendPushToLocation(args: SendPushArgs): Promise<SendPushResult> {
  configureWebPush();

  const preferenceColumn = getPreferenceColumn(args.notificationType);

  const { data: subscriptions, error: subError } = await supabaseAdmin
    .from("push_subscriptions")
    .select(
      `
      id,
      subscription,
      notify_closing_signoff,
      notify_cleaning,
      notify_temp_fail,
      notify_training,
      notify_allergen
    `
    )
    .eq("org_id", args.orgId)
    .eq("enabled", true)
    .or(`location_id.is.null,location_id.eq.${args.locationId}`);

  if (subError) throw subError;

  const eligibleSubscriptions = ((subscriptions ?? []) as PushSubscriptionRow[]).filter((row) =>
    preferenceAllows(row, preferenceColumn)
  );

  if (!eligibleSubscriptions.length) {
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

  for (const row of eligibleSubscriptions) {
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