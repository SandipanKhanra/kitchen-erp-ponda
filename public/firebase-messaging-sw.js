/* eslint-disable no-restricted-globals */
// Dedicated Service Worker for Firebase Cloud Messaging (FCM) background push notifications.
// Handles closed-app / background push payloads sent via the Cloudflare Worker (FCM HTTP v1 API).

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { notification: { title: 'Ponda Kitchen ERP', body: event.data.text() } };
  }

  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = notif.title || data.title || 'Ponda Kitchen ERP';
  const body = notif.body || data.body || 'You have a new kitchen notification.';
  const targetUrl = data.url || '/menu-planner';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: notif.icon || '/pwa-192x192.png',
      badge: notif.badge || '/pwa-192x192.png',
      tag: `kitchen-fcm-${Date.now()}`,
      data: { url: targetUrl },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/menu-planner';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && targetUrl) {
            return client.navigate(targetUrl);
          }
          return client;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
