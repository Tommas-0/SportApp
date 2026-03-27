import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export type PushPayload = {
  title: string;
  body: string;
  icon?: string;
  url?: string;
};

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function sendPushNotification(
  subscription: PushSubscriptionRecord,
  payload: PushPayload
) {
  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify({
      title: payload.title,
      body:  payload.body,
      icon:  payload.icon  ?? "/icons/icon-192.png",
      url:   payload.url   ?? "/dashboard",
    })
  );
}
