import { db, initNav, esc, msg, busy, reveal } from './app.js';
import { fdt } from './content.js';
import { collection, query, where, getDocs, doc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const p = await initNav();
if (!p) location.replace('login.html'); else if (p.isAdmin) location.replace('admin-requests.html');
else {
  const out = document.getElementById('msg'), list = document.getElementById('list'), all = document.getElementById('read-all');
  let rows = [];
  try {
    const s = await getDocs(query(collection(db, 'notifications'), where('userId', '==', p.uid)));
    rows = s.docs.map((d) => Object.assign({ id: d.id }, d.data())).sort((a, b) => (b.createdAt ? b.createdAt.seconds : 9e9) - (a.createdAt ? a.createdAt.seconds : 9e9)).slice(0, 50);
  } catch (e) { msg(out, 'error', 'تعذّر تحميل الإشعارات.'); }
  const render = () => {
    all.hidden = !rows.some((r) => !r.read);
    list.innerHTML = rows.length ? rows.map((r) => '<a class="notif reveal ' + (r.read ? '' : 'unread') + '" href="requests.html#' + esc(r.requestId) + '" data-id="' + esc(r.id) + '"><span>' + esc(r.text) + '</span><small>' + (r.read ? 'مقروء' : 'جديد') + ' · ' + fdt(r.createdAt) + '</small></a>').join('')
      : '<p class="empty">لا توجد إشعارات.</p>';
    reveal(list);
  };
  list.addEventListener('click', async (e) => {
    const a = e.target.closest('a[data-id]'); if (!a) return;
    const r = rows.find((x) => x.id === a.dataset.id);
    if (r && !r.read) { e.preventDefault(); try { const b = writeBatch(db); b.update(doc(db, 'notifications', r.id), { read: true }); await b.commit(); } catch (x) {} location.href = a.href; }
  });
  all.addEventListener('click', async () => {
    busy(all, true, 'جارٍ التنفيذ…');
    try { const b = writeBatch(db); rows.filter((r) => !r.read).slice(0, 400).forEach((r) => { b.update(doc(db, 'notifications', r.id), { read: true }); r.read = true; }); await b.commit(); render(); }
    catch (e) { msg(out, 'error', 'تعذّر تعليم الإشعارات كمقروءة.'); }
    busy(all, false);
  });
  render();
}
