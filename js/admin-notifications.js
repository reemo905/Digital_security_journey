import { db, initNav, esc, msg, busy, reveal, refreshBadges } from './app.js';
import { SERVICES, ICONS } from './services.js';
import { fdt } from './content.js';
import { mountPushBox } from './push.js';
import { collection, query, orderBy, limit, onSnapshot, getDoc, doc, setDoc, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const me = await initNav();
if (!me || !me.isAdmin) location.replace('index.html');
else {
  document.getElementById('admin-main').hidden = false;
  mountPushBox(document.getElementById('push'));
  const out = document.getElementById('msg'), list = document.getElementById('list'), all = document.getElementById('read-all');
  let seenMs = 0, rows = [];
  try { const s = await getDoc(doc(db, 'adminSeen', me.uid)); if (s.exists() && s.data().seenAt) seenMs = s.data().seenAt.toMillis(); } catch (e) {}
  const ts = (t) => (t && t.toMillis ? t.toMillis() : Date.now());
  function render() {
    all.hidden = !rows.some((r) => ts(r.createdAt) > seenMs);
    list.innerHTML = rows.length ? rows.map((r) => { const S = SERVICES[r.requestType], nw = ts(r.createdAt) > seenMs;
      return '<a class="notif reveal ' + (nw ? 'unread' : '') + '" href="admin-requests.html?type=' + esc(r.requestType) + '&status=new"><span><span class="ic sm">' + (ICONS[r.requestType] || '') + '</span> ' +
        (S ? esc(S.label) : 'طلب') + ' جديد من ' + esc(r.ownerName) + ': «' + esc(r.title) + '»</span><small>' + (nw ? 'جديد' : 'مقروء') + ' · ' + fdt(r.createdAt) + '</small></a>'; }).join('')
      : '<p class="empty">لا توجد إشعارات بعد. ستظهر هنا الطلبات الجديدة فور وصولها.</p>';
    reveal(list);
  }
  onSnapshot(query(collection(db, 'adminFeed'), orderBy('createdAt', 'desc'), limit(60)), (s) => { rows = s.docs.map((d) => Object.assign({ id: d.id }, d.data())); render(); }, () => msg(out, 'error', 'تعذّر تحميل الإشعارات.'));
  all.addEventListener('click', async () => {
    busy(all, true, 'جارٍ التنفيذ…');
    try { await setDoc(doc(db, 'adminSeen', me.uid), { seenAt: serverTimestamp() }); seenMs = Date.now(); render(); refreshBadges(); }
    catch (e) { msg(out, 'error', 'تعذّر تعليم الإشعارات كمقروءة.'); }
    busy(all, false);
  });
}
