import { db, initNav, esc, msg, reveal } from './app.js';
import { SERVICES, TYPES, ICONS, statusLabel, refCode, fmtDate, detailsHtml } from './services.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const p = await initNav();
if (!p) location.replace('login.html');
else if (p.isAdmin) location.replace('admin-requests.html');
else {
  const out = document.getElementById('msg'), list = document.getElementById('list'), flt = document.getElementById('flt');
  flt.innerHTML = '<option value="">كل الأنواع</option>' + TYPES.map((t) => '<option value="' + t + '">' + esc(SERVICES[t].label) + '</option>').join('');
  const sent = new URLSearchParams(location.search).get('sent');
  if (sent) msg(out, 'success', 'تم حفظ طلبك. رقمه المرجعي: ' + refCode(sent) + '. سترين حالته وأي رد هنا. وإرسال الطلب لا يعني الموافقة عليه. يمكنك إرسال طلب جديد بعد دقيقتين.');
  let rows = [];
  try {
    const s = await getDocs(query(collection(db, 'requests'), where('ownerId', '==', p.uid)));  // الترتيب في المتصفح لتفادي إنشاء فهارس
    rows = s.docs.map((d) => Object.assign({ id: d.id }, d.data())).sort((a, b) => (b.createdAt ? b.createdAt.seconds : 9e9) - (a.createdAt ? a.createdAt.seconds : 9e9));
  } catch (e) { msg(out, 'error', 'تعذّر تحميل طلباتك. تحققي من الاتصال وأعيدي المحاولة.'); }
  const render = () => {
    const t = flt.value, items = rows.filter((r) => !t || r.type === t);
    list.innerHTML = items.length ? items.map((r) =>
      '<details class="req reveal" id="r-' + esc(r.id) + '"><summary><span class="ic sm">' + ICONS[r.type] + '</span><span class="rt"><strong>' + esc(r.title) + '</strong><small>' +
      esc(SERVICES[r.type].label) + ' · ' + fmtDate(r.createdAt) + ' · رقم ' + refCode(r.id) + '</small></span><span class="badge st-' + esc(r.status) + '">' + esc(statusLabel(r.type, r.status)) + '</span></summary>' +
      '<div class="req-body">' + detailsHtml(r, esc) +
      (r.schedule ? '<div class="reply"><strong>الموعد النهائي:</strong> ' + esc(r.schedule) + '</div>' : '') +
      (r.reply ? '<div class="reply"><strong>ردّ رئيسة البرلمان:</strong><p class="pre">' + esc(r.reply) + '</p></div>' : '<p class="note">لا يوجد ردّ بعد.</p>') +
      '<p class="note">آخر تحديث: ' + fmtDate(r.updatedAt) + '</p></div></details>').join('')
      : '<p class="empty">لا توجد طلبات' + (t ? ' من هذا النوع' : ' بعد') + '.</p>';
    reveal(list);
    const h = location.hash.slice(1); const el = h && document.getElementById('r-' + h);
    if (el) { el.open = true; el.scrollIntoView({ block: 'center' }); }
  };
  flt.addEventListener('change', render); render();
}
