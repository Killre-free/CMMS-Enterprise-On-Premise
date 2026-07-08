// public/sw.js
// Minimal service worker: exists solely to receive Web Push events while the
// app tab is closed/backgrounded and surface them as OS notifications.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "CMMS Pro", message: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || "CMMS Pro", {
      body: payload.message,
      data: { linkUrl: payload.linkUrl || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.linkUrl || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
