import { db, initNav, esc, msg, busy, reveal, refreshBadges } from './app.js';
import { BY_KIND, fdt } from './content.js';
import { mountPushBox } from './push.js';
import { collection, query, where, orderBy, limit, onSnapshot, getDoc, doc, writeBatch, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const p = await initNav();
if (!p) location.replace('login.html'); else if (p.isAdmin) location.replace('admin-notifications.html');
else {
  mountPushBox(document.getElementById('push'));
  const out = document.getElementById('msg'), list = document.getElementById('list'), all = document.getElementById('read-all');
  let seenMs = p.createdAtMs || 0, personal = [], broadcasts = [];
  try { const s = await getDoc(doc(db, 'seen', p.uid)); if (s.exists() && s.data().broadcastSeenAt) seenMs = Math.max(seenMs, s.data().broadcastSeenAt.toMillis()); } catch (e) {}
  const ts = (t) => (t && t.toMillis ? t.toMillis() : Date.now());
  function render() {
    const items = personal.map((r) => ({ id: r.id, personal: true, text: r.text, href: 'requests.html#' + r.requestId, unread: !r.read, t: ts(r.createdAt), at: r.createdAt }))
      .concat(broadcasts.filter((b) => BY_KIND[b.kind]).map((b) => ({ id: b.id, text: BY_KIND[b.kind].label + ': ' + b.title, href: BY_KIND[b.kind].href, unread: ts(b.createdAt) > seenMs, t: ts(b.createdAt), at: b.createdAt })))
      .sort((a, b) => b.t - a.t).slice(0, 60);
    all.hidden = !items.some((i) => i.unread);
    list.innerHTML = items.length ? items.map((r) => '<a class="notif reveal ' + (r.unread ? 'unread' : '') + '" href="' + esc(r.href) + '" data-id="' + esc(r.id) + '" data-p="' + (r.personal ? 1 : 0) + '"><span>' + esc(r.text) + '</span><small>' + (r.unread ? 'جديد' : 'مقروء') + ' · ' + fdt(r.at) + '</small></a>').join('')
      : '<p class="empty">لا توجد إشعارات.</p>';
    reveal(list);
  }
  // تحديث لحظي: أي إشعار جديد يظهر هنا دون إعادة تحميل
  onSnapshot(query(collection(db, 'notifications'), where('userId', '==', p.uid)), (s) => { personal = s.docs.map((d) => Object.assign({ id: d.id }, d.data())); render(); }, () => msg(out, 'error', 'تعذّر تحميل الإشعارات.'));
  onSnapshot(query(collection(db, 'broadcasts'), orderBy('createdAt', 'desc'), limit(30)), (s) => { broadcasts = s.docs.map((d) => Object.assign({ id: d.id }, d.data())); render(); }, () => {});
  list.addEventListener('click', async (e) => {
    const a = e.target.closest('a[data-id]'); if (!a || a.dataset.p !== '1') return;
    const r = personal.find((x) => x.id === a.dataset.id);
    if (r && !r.read) { e.preventDefault(); try { const b = writeBatch(db); b.update(doc(db, 'notifications', r.id), { read: true }); await b.commit(); } catch (x) {} location.href = a.href; }
  });
  all.addEventListener('click', async () => {
    busy(all, true, 'جارٍ التنفيذ…');
    try {
      const b = writeBatch(db); personal.filter((r) => !r.read).slice(0, 400).forEach((r) => b.update(doc(db, 'notifications', r.id), { read: true }));
      b.set(doc(db, 'seen', p.uid), { broadcastSeenAt: serverTimestamp() }); await b.commit();
      seenMs = Date.now(); render(); refreshBadges();
    } catch (e) { msg(out, 'error', 'تعذّر تعليم الإشعارات كمقروءة.'); }
    busy(all, false);
  });
}
