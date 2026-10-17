import { db, initNav, esc, msg, busy } from './app.js';
import { SERVICES } from './services.js';
import { collection, doc, getDoc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const type = new URLSearchParams(location.search).get('type');
const S = SERVICES[type];
const p = await initNav();
const root = document.getElementById('form-root');
if (!S) { location.replace('index.html'); }
else if (!p) { location.replace('login.html'); }
else if (p.isAdmin) { root.innerHTML = '<p class="msg msg-error">هذه الخدمة مخصصة للطالبات. للتجربة استخدمي حساب طالبة.</p>'; }
else {
  document.title = S.label + ' — بوابة البرلمان الطلابي';
  const all = [{ k: 'title', label: S.titleLabel, type: 'text', min: 3, max: 100, required: true }].concat(S.fields);
  const html = (f) => {
    const id = 'f-' + f.k, tag = f.required ? '<span class="req">(مطلوب)</span>' : '<span class="opt">(اختياري)</span>';
    let c;
    if (f.type === 'select') c = '<select id="' + id + '"><option value="">اختاري…</option>' + f.options.map((o) => '<option value="' + o[0] + '">' + esc(o[1]) + '</option>').join('') + '</select>';
    else if (f.type === 'textarea') c = '<textarea id="' + id + '" rows="5" maxlength="' + f.max + '"></textarea>';
    else c = '<input id="' + id + '" maxlength="' + f.max + '">';
    const safety = (S.safety && S.safety.field === f.k) ? '<div class="alert" id="safety" hidden>' + esc(S.safety.text) + '</div>' : '';
    return '<div class="field"><label for="' + id + '">' + esc(f.label) + ' ' + tag + '</label>' + (f.hint ? '<p class="hint">' + esc(f.hint) + '</p>' : '') +
      c + safety + '<p class="ferr" id="err-' + f.k + '" hidden></p></div>';
  };
  root.innerHTML = '<h1>' + esc(S.label) + '</h1><p class="note">' + esc(S.note) + '</p>' +
    '<form id="svc-form" class="panel" novalidate>' + all.map(html).join('') +
    '<div id="cooldown" class="cooldown" role="status" aria-live="polite" hidden></div><button class="btn" type="submit">إرسال</button><div id="msg" class="msg" role="alert" hidden></div></form>';
  const out = document.getElementById('msg'), form = document.getElementById('svc-form');
  const subBtn = form.querySelector('button[type=submit]'), cdBox = document.getElementById('cooldown');
  const COOL_MS = 120000;
  let last = 0, working = false;
  async function loadLast() {
    try { const r = await getDoc(doc(db, 'rateLimits', p.uid)); last = r.exists() && r.data().lastRequestAt ? r.data().lastRequestAt.toMillis() : 0; } catch (e) {}
  }
  const remainingMs = () => last ? Math.max(0, last + COOL_MS + 1500 - Date.now()) : 0;   // 1.5 ثانية هامش لفرق الساعة
  function tick() {
    const r = remainingMs(), sec = Math.ceil(r / 1000);
    if (r > 0) { cdBox.hidden = false; cdBox.textContent = 'يمكنك إرسال طلب جديد بعد ' + String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0') + ' (نترك دقيقتين بين كل طلبين).'; }
    else if (!cdBox.hidden) { cdBox.textContent = 'انتهت المهلة. يمكنك الآن إرسال الطلب.'; setTimeout(() => { if (!remainingMs()) cdBox.hidden = true; }, 4000); }
    if (!working) subBtn.disabled = r > 0;
  }
  await loadLast(); tick(); setInterval(tick, 1000);
  const val = (k) => document.getElementById('f-' + k).value.trim();

  const setErr = (k, text) => {
    const e = document.getElementById('err-' + k), c = document.getElementById('f-' + k);
    e.hidden = !text; e.textContent = text || ''; if (text) c.setAttribute('aria-invalid', 'true'); else c.removeAttribute('aria-invalid');
  };
  all.forEach((f) => document.getElementById('f-' + f.k).addEventListener('input', () => setErr(f.k, '')));
  if (S.safety) document.getElementById('f-' + S.safety.field).addEventListener('change', (e) => {
    document.getElementById('safety').hidden = e.target.value !== S.safety.value;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let bad = 0, first = null;
    for (const f of all) {
      const v = val(f.k); let err = '';
      if (f.required && !v) err = f.type === 'select' ? 'اختاري أحد الخيارات.' : 'هذا الحقل مطلوب.';
      else if (v && f.min && v.length < f.min) err = 'اكتبي ' + f.min + ' أحرف على الأقل.';
      else if (v && f.type === 'select' && !f.options.some((o) => o[0] === v)) err = 'اختاري أحد الخيارات.';
      setErr(f.k, err); if (err) { bad++; if (!first) first = f.k; }
    }
    if (bad) { msg(out, 'error', 'يوجد ' + bad + ' من الحقول تحتاج إلى تصحيح. راجعي الرسائل الحمراء تحت الحقول.'); document.getElementById('f-' + first).focus({ preventScroll: true }); return; }
    if (remainingMs() > 0) { tick(); return msg(out, 'error', 'يلزم الانتظار دقيقتين بين كل طلبين. انتظري انتهاء العدّاد ثم أرسلي.'); }
    const btn = subBtn; working = true; busy(btn, true, 'جارٍ الإرسال…');
    const details = {}; S.fields.forEach((f) => { details[f.k] = val(f.k); });
    try {
      const b = writeBatch(db), ref = doc(collection(db, 'requests'));
      b.set(ref, { ownerId: p.uid, ownerName: p.fullName, type, title: val('title'), status: 'new', reply: '', details, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      b.set(doc(db, 'rateLimits', p.uid), { lastRequestAt: serverTimestamp() });   // تسجيل وقت الطلب لحساب المهلة
      await b.commit();
      location.href = 'requests.html?sent=' + ref.id;   // لا نعرض النجاح إلا بعد نجاح الحفظ فعلًا
    } catch (err) {
      working = false; busy(btn, false);
      await loadLast(); tick();
      msg(out, 'error', remainingMs() > 0 ? 'لم يُحفظ الطلب لأن المهلة بين الطلبات لم تنتهِ بعد. انتظري العدّاد ثم أعيدي الإرسال (بياناتك ما زالت في النموذج).'
        : (err && err.code === 'unavailable') ? 'تعذّر الاتصال بالإنترنت، ولم يُحفظ طلبك. أعيدي المحاولة (بياناتك ما زالت في النموذج).'
        : 'تعذّر حفظ الطلب. تأكدي من الحقول وأعيدي المحاولة، وبياناتك ما زالت في النموذج.');
    }
  });
}
