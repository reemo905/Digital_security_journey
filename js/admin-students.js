import { db, initNav, esc, msg, busy, reveal, auditLog } from './app.js';
import { fdate, fdt } from './content.js';
import { unlockWithPin, pinHash, DEFAULT_PIN, normPin, UNLOCK_ERR } from './pin.js';
import { workerConfigured, workerCall } from './push.js';
import { collection, query, orderBy, getDocs, getDoc, getCountFromServer, where, doc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const me = await initNav();
if (!me || !me.isAdmin) { location.replace('index.html'); }
else {
  document.getElementById('admin-main').hidden = false;
  const $ = (id) => document.getElementById(id);
  const lock = $('lock'), panel = $('panel'), body = $('rows'), dlg = $('dlg'), dBody = $('dlg-body'), out = $('msg');
  let students = [], until = 0, timer = null, usedDefault = false, cur = null;
  const fmtCode = (c) => c && c.length === 10 ? c.slice(0, 5) + '-' + c.slice(5) : (c || '—');

  function lockUI() {
    clearInterval(timer); until = 0; students = []; body.innerHTML = ''; dBody.innerHTML = ''; try { dlg.close(); } catch (e) {}
    panel.hidden = true; lock.hidden = false; $('pin').value = '';
  }
  function tick() {
    const s = Math.ceil((until - Date.now()) / 1000);
    if (s <= 0) { lockUI(); msg($('msg-lock'), 'error', 'انتهت مدة فتح القفل. أدخلي الرمز مرة أخرى.'); return; }
    $('timer').textContent = 'يُغلق القفل تلقائيًا بعد ' + String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  const render = () => {
    const q = $('q').value.trim().toLowerCase();
    const items = students.filter((s) => !q || (s.fullName + ' ' + (s.grade || '')).toLowerCase().includes(q));
    body.innerHTML = items.map((s) => '<tr><td>' + esc(s.fullName) + '</td><td>' + esc(s.grade || '—') + '</td><td>' + (s.isActive ? 'مفعّل' : 'معطّل') + '</td><td>' + fdate(s.createdAt) +
      '</td><td><button class="btn btn-small" data-open="' + esc(s.id) + '">تفاصيل</button></td></tr>').join('') || '<tr><td colspan="5">لا توجد نتائج.</td></tr>';
    $('count').textContent = students.length;
  };
  async function load() {
    try {
      students = (await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')))).docs.map((d) => Object.assign({ id: d.id }, d.data()));
      render();
    } catch (e) { lockUI(); msg($('msg-lock'), 'error', 'تعذّر تحميل البيانات (ربما انتهى القفل).'); }
  }

  $('unlock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pin = $('pin').value, btn = e.target.querySelector('button[type=submit]'), m = $('msg-lock');
    if (!pin) return msg(m, 'error', 'أدخلي رمز الحماية.');
    busy(btn, true, 'جارٍ التحقق…');
    let res; try { res = await unlockWithPin(me.uid, pin); } catch (err) { res = { ok: false, reason: 'network' }; }
    busy(btn, false);
    if (!res.ok) return msg(m, 'error', UNLOCK_ERR[res.reason] || UNLOCK_ERR.network);
    usedDefault = normPin(pin) === DEFAULT_PIN; m.hidden = true;
    until = Date.now() + 5 * 60 * 1000 - 3000;
    lock.hidden = true; panel.hidden = false; $('default-warn').hidden = !usedDefault;
    tick(); timer = setInterval(tick, 1000); await load();
  });
  $('lock-now').onclick = lockUI;
  $('q').addEventListener('input', render);

  body.addEventListener('click', async (e) => {
    const id = e.target.dataset && e.target.dataset.open; if (!id) return;
    cur = students.find((s) => s.id === id); if (!cur) return;
    let label = '', count = '—';
    try { const inv = await getDoc(doc(db, 'invites', cur.inviteCode)); if (inv.exists()) label = inv.data().label; } catch (x) {}
    try { count = (await getCountFromServer(query(collection(db, 'requests'), where('ownerId', '==', cur.id)))).data().count; } catch (x) {}
    try { const b = writeBatch(db); auditLog(b, me.uid, 'student_viewed', cur.id.slice(0, 6) + '…'); await b.commit(); } catch (x) {}
    const w = workerConfigured();
    dBody.innerHTML = '<h2>' + esc(cur.fullName) + '</h2><dl class="dl">' +
      '<dt>الاسم</dt><dd>' + esc(cur.fullName) + '</dd><dt>الصف</dt><dd>' + esc(cur.grade || '—') + '</dd>' +
      '<dt>الحالة</dt><dd>' + (cur.isActive ? 'مفعّل' : 'معطّل') + '</dd><dt>تاريخ التسجيل</dt><dd>' + fdt(cur.createdAt) + '</dd>' +
      '<dt>رمز الدعوة المستخدم</dt><dd dir="ltr">' + esc(fmtCode(cur.inviteCode)) + (label ? ' (' + esc(label) + ')' : '') + '</dd>' +
      '<dt>عدد الطلبات المرسلة</dt><dd>' + count + '</dd>' +
      '<dt>كلمة المرور</dt><dd>لا يمكن عرضها: تُحفظ مشفّرة ولا يستطيع أحد قراءتها، حتى نحن. إن نسيتها الطالبة فأنشئي لها كلمة مرور مؤقتة أدناه.</dd></dl>' +
      '<h3>إجراءات</h3><button class="btn btn-small" id="a-toggle" type="button">' + (cur.isActive ? 'تعطيل الحساب' : 'تفعيل الحساب') + '</button>' +
      (w ? '' : '<p class="note">حذف الحساب وكلمة المرور المؤقتة يتطلبان إعداد خدمة Worker (راجعي WORKER_SETUP.md).</p>') +
      '<div class="panel"><h3>كلمة مرور مؤقتة</h3><label for="a-pin1">رمز الحماية</label><input id="a-pin1" type="password" autocomplete="off">' +
      '<button class="btn btn-small" id="a-temp" type="button"' + (w ? '' : ' disabled') + '>إنشاء كلمة مرور مؤقتة</button></div>' +
      '<div class="panel"><h3>حذف الحساب نهائيًا</h3><p class="note">يُحذف الحساب وطلباتها وإشعاراتها وسجل تصويتها ولا يمكن التراجع.</p>' +
      '<label for="a-name">اكتبي اسم الطالبة للتأكيد</label><input id="a-name" autocomplete="off"><label for="a-pin2">رمز الحماية</label><input id="a-pin2" type="password" autocomplete="off">' +
      '<button class="btn btn-small btn-danger" id="a-del" type="button"' + (w ? '' : ' disabled') + '>حذف نهائي</button></div>' +
      '<div id="a-msg" class="msg" role="alert" hidden></div>';
    dlg.showModal();
  });
  $('dlg-close').onclick = () => dlg.close();

  dlg.addEventListener('click', async (e) => {
    const id = e.target.id, m = $('a-msg'); if (!m || !cur) return;
    if (id === 'a-toggle') {
      busy(e.target, true, 'جارٍ التنفيذ…');
      try { const to = !cur.isActive, b = writeBatch(db);
        b.update(doc(db, 'users', cur.id), { isActive: to }); auditLog(b, me.uid, to ? 'account_activated' : 'account_deactivated', cur.id.slice(0, 6) + '…'); await b.commit();
        cur.isActive = to; render(); dlg.close(); msg(out, 'success', to ? 'تم تفعيل الحساب.' : 'تم تعطيل الحساب.');
      } catch (err) { busy(e.target, false); msg(m, 'error', 'تعذّرت العملية (ربما انتهى القفل).'); }
    }
    if (id === 'a-temp') {
      const pin = $('a-pin1').value; if (!pin) return msg(m, 'error', 'أدخلي رمز الحماية.');
      if (!confirm('إنشاء كلمة مرور مؤقتة لـ ' + cur.fullName + '؟ ستتوقف كلمة مرورها الحالية عن العمل.')) return;
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; let pw = ''; for (const x of crypto.getRandomValues(new Uint8Array(12))) pw += A[x % A.length];
      busy(e.target, true, 'جارٍ التنفيذ…');
      const r = await workerCall('/admin/set-password', { targetUid: cur.id, newPassword: pw, pinHash: await pinHash(pin) }).catch(() => ({ ok: false, status: 0, data: {} }));
      busy(e.target, false);
      if (r.ok) { m.className = 'msg msg-success'; m.innerHTML = 'كلمة المرور المؤقتة (تظهر مرة واحدة، سلّميها للطالبة بشكل خاص وأخبريها أن تغيّرها من «الإعدادات»):<p class="code" dir="ltr">' + esc(pw) + '</p>'; m.hidden = false; m.scrollIntoView({ block: 'center' }); }
      else msg(m, 'error', r.data.error === 'wrong_pin' ? 'رمز الحماية غير صحيح.' : 'تعذّر تنفيذ العملية. تأكدي من إعداد الـ Worker.');
    }
    if (id === 'a-del') {
      const pin = $('a-pin2').value; if ($('a-name').value.trim() !== cur.fullName) return msg(m, 'error', 'اكتبي اسم الطالبة كما هو تمامًا للتأكيد.');
      if (!pin) return msg(m, 'error', 'أدخلي رمز الحماية.');
      if (!confirm('تأكيد أخير: حذف ' + cur.fullName + ' نهائيًا؟ لا يمكن التراجع.')) return;
      busy(e.target, true, 'جارٍ الحذف…');
      const r = await workerCall('/admin/delete-student', { targetUid: cur.id, pinHash: await pinHash(pin) }).catch(() => ({ ok: false, status: 0, data: {} }));
      busy(e.target, false);
      if (r.ok) { students = students.filter((s) => s.id !== cur.id); render(); dlg.close(); msg(out, 'success', 'تم حذف الحساب وبياناته نهائيًا.'); }
      else msg(m, 'error', r.data.error === 'wrong_pin' ? 'رمز الحماية غير صحيح.' : 'تعذّر الحذف الكامل. أعيدي المحاولة (العملية آمنة للتكرار)، وتأكدي من إعداد الـ Worker.');
    }
  });
}
