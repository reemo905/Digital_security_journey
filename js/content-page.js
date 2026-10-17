import { db, initNav, esc, msg, reveal } from './app.js';
import { CONTENT, kindLabel, fdate } from './content.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const c = new URLSearchParams(location.search).get('c'), C = CONTENT[c];
const p = await initNav();
if (!C || c === 'polls') location.replace('index.html'); else if (!p) location.replace('login.html');
else {
  document.getElementById('h').textContent = C.label; document.title = C.label + ' — بوابة البرلمان الطلابي';
  const list = document.getElementById('list'), out = document.getElementById('msg');
  let rows = [];
  try {
    const q = C.publishable ? query(collection(db, c), where('published', '==', true)) : collection(db, c);
    rows = (await getDocs(q)).docs.map((d) => Object.assign({ id: d.id }, d.data()));
  } catch (e) { msg(out, 'error', 'تعذّر تحميل المحتوى. تحققي من الاتصال.'); }
  const ms = (t) => (t && t.toMillis ? t.toMillis() : 0);
  const pre = (t) => '<p class="pre">' + esc(t) + '</p>';
  if (c === 'announcements') rows = rows.filter((r) => !r.expiresAt || r.expiresAt.toMillis() > Date.now()).sort((a, b) => ms(b.publishedAt) - ms(a.publishedAt));
  if (c === 'achievements') rows.sort((a, b) => ms(b.eventDate) - ms(a.eventDate));
  if (c === 'initiatives') rows.sort((a, b) => ms(b.startDate) - ms(a.startDate));
  if (c === 'faq') rows.sort((a, b) => a.order - b.order);
  const empty = { announcements: 'لا توجد إعلانات حاليًا.', achievements: 'لم تُنشر إنجازات بعد.', initiatives: 'لا توجد مبادرة منشورة حاليًا.', faq: 'لم تُضف أسئلة بعد.' };
  const one = (r) => {
    if (c === 'announcements') return '<article class="panel reveal"><span class="badge">' + esc(kindLabel(r.kind)) + '</span><h2>' + esc(r.title) + '</h2>' + pre(r.body) + '<p class="note">نُشر: ' + fdate(r.publishedAt) + (r.expiresAt ? ' · ينتهي: ' + fdate(r.expiresAt) : '') + '</p></article>';
    if (c === 'achievements') return '<article class="panel reveal"><h2>' + esc(r.title) + '</h2><p class="note">' + fdate(r.eventDate) + '</p>' + pre(r.body) + '</article>';
    if (c === 'initiatives') return '<article class="panel reveal"><span class="badge ' + (r.status === 'open' ? 'st-accepted' : 'st-closed') + '">' + (r.status === 'open' ? 'مفتوحة' : 'مغلقة') + '</span><h2>' + esc(r.title) + '</h2><p class="note">من ' + fdate(r.startDate) + ' إلى ' + fdate(r.endDate) + '</p>' +
      pre(r.body) + '<h3>الأهداف</h3>' + pre(r.goals) + '<h3>كيف تشاركين؟</h3>' + pre(r.howTo) + (r.summary ? '<div class="reply"><strong>الملخص النهائي:</strong>' + pre(r.summary) + '</div>' : '') + '</article>';
    return '<details class="req reveal"><summary><span class="rt"><strong>' + esc(r.question) + '</strong></span></summary><div class="req-body">' + pre(r.answer) + '</div></details>';
  };
  list.innerHTML = rows.length ? rows.map(one).join('') : '<p class="empty">' + empty[c] + '</p>';
  reveal(list);
}
