const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerPushNotifications(): Promise<boolean> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    console.warn("[push] Push notifications not supported")
    return false
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn("[push] VAPID public key not configured")
    return false
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js")
    await navigator.serviceWorker.ready

    const permission = await Notification.requestPermission()
    if (permission !== "granted") {
      console.warn("[push] Notification permission denied")
      return false
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const subscriptionJson = subscription.toJSON()
    const p256dh = subscriptionJson.keys?.p256dh ?? ""
    const auth = subscriptionJson.keys?.auth ?? ""

    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        p256dh,
        auth,
      }),
    })

    if (!res.ok) {
      console.error("[push] Failed to save subscription")
      return false
    }

    return true
  } catch (err) {
    console.error("[push] Registration failed", err)
    return false
  }
}

export async function unsubscribePush(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      return true
    }

    const endpoint = subscription.endpoint

    await fetch("/api/push/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint }),
    })

    await subscription.unsubscribe()

    return true
  } catch (err) {
    console.error("[push] Unsubscribe failed", err)
    return false
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch {
    return null
  }
}
