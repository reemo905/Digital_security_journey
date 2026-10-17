// لا تخزين مؤقت عمدًا: كل الطلبات تذهب للشبكة، فلا تبقى بيانات طالبات في ذاكرة الجهاز.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
