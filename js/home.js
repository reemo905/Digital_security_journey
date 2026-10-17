import { db, initNav, esc, reveal } from './app.js';
import { SERVICES, TYPES, ICONS } from './services.js';
import { CONTENT, kindLabel, fdate } from './content.js';
import { collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const p = await initNav();
if (p) document.getElementById('welcome').textContent = 'أهلًا بكِ، ' + p.fullName;
document.getElementById('cta-login').hidden = !!p;
const card = (href, icon, title, text) => '<a class="card reveal" href="' + href + '"><span class="ic">' + icon + '</span><h3>' + title + '</h3><p>' + text + '</p><span class="go">فتح ←</span></a>';
document.getElementById('services').innerHTML = TYPES.map((t) => card('service.html?type=' + t, ICONS[t], SERVICES[t].label, SERVICES[t].short)).join('') +
  card('requests.html', ICONS.list, 'طلباتي', 'تابعي حالة كل ما أرسلتِه والردود عليه.') +
  card('settings.html', ICONS.event, 'الإعدادات', 'غيّري كلمة المرور والاسم والألوان وحجم الخط.');
const I = ICONS;
document.getElementById('more').innerHTML =
  card('content.html?c=announcements', I.message, 'الإعلانات', 'آخر ما تنشره رئيسة البرلمان.') +
  card('polls.html', I.suggestion, 'التصويت على الأفكار', 'شاركي برأيك في الأفكار المعروضة.') +
  card('content.html?c=initiatives', I.event, 'المبادرة الشهرية', 'تحدٍّ أو مبادرة هذا الشهر.') +
  card('content.html?c=achievements', I.list, 'إنجازات البرلمان', 'ما أُنجز بفضل مشاركاتكنّ.') +
  card('content.html?c=faq', I.problem, 'الأسئلة الشائعة', 'إجابات عن استخدام البوابة.');
if (p) {
  const sec = document.getElementById('ann-sec'), box = document.getElementById('ann'); sec.hidden = false;
  try {
    const s = await getDocs(query(collection(db, 'announcements'), where('published', '==', true)));
    const now = Date.now(), ms = (t) => (t && t.toMillis ? t.toMillis() : 0);
    const rows = s.docs.map((d) => d.data()).filter((r) => !r.expiresAt || r.expiresAt.toMillis() > now).sort((a, b) => ms(b.publishedAt) - ms(a.publishedAt)).slice(0, 3);
    box.innerHTML = rows.length ? rows.map((r) => '<article class="panel reveal"><span class="badge">' + esc(kindLabel(r.kind)) + '</span><h3>' + esc(r.title) + '</h3><p class="pre">' + esc(r.body.length > 160 ? r.body.slice(0, 160) + '…' : r.body) + '</p><p class="note">' + fdate(r.publishedAt) + '</p></article>').join('') + '<p><a href="content.html?c=announcements">كل الإعلانات ←</a></p>' : '<p class="empty">لا توجد إعلانات حاليًا.</p>';
  } catch (e) { box.innerHTML = '<p class="empty">تعذّر تحميل الإعلانات.</p>'; }
}
reveal();
