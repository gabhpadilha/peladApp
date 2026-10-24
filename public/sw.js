// Service worker do PeladApp. Sem cache de páginas de propósito: o app depende da
// sessão e de dados ao vivo, e um cache velho mostraria OVR e rodadas antigos.
// Hoje só deixa o app instalável e pronto para receber notificações (push).

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Mensagem esperada: { title, body, url? } (url = caminho do app, ex.: "/rodadas/<id>/vencedores").
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "PeladApp", body: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "PeladApp", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/" },
    }),
  );
});

// Toque na notificação: foca uma janela do app aberta ou abre uma nova, sempre no próprio site.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => client.url.startsWith(self.location.origin));
      if (open) return open.navigate(url).then((client) => (client || open).focus());
      return self.clients.openWindow(url);
    }),
  );
});
