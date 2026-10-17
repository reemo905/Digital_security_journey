import { db, initNav, esc, msg, busy, reveal } from './app.js';
import { SERVICES, TYPES, ICONS } from './services.js';
import { collection, doc, getDocs, query, orderBy, limit, where, writeBatch, serverTimestamp, Timestamp }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const me = await initNav();
// التوجيه لتحسين التجربة فقط. قواعد قاعدة البيانات ترفض أي عملية إدارية من غير المديرة.
if (!me || !me.isAdmin) { location.replace('index.html'); }
else {
  document.getElementById('admin-main').hidden = false;
  const out = document.getElementById('msg');
  const fmt = (t) => (t && t.toDate) ? t.toDate().toLocaleDateString('ar') : '—';
  const ACTIONS = { invite_created: 'إنشاء رمز دعوة', invite_revoked: 'إلغاء رمز دعوة',
    account_activated: 'تفعيل حساب', account_deactivated: 'تعطيل حساب', request_updated: 'تحديث طلب', content_saved: 'حفظ محتوى', content_deleted: 'حذف محتوى', content_published: 'نشر محتوى', content_unpublished: 'إلغاء نشر محتوى' };
  const fail = (t) => msg(out, 'error', t);

  const genCode = () => {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // 32 حرفًا، بلا أحرف ملتبسة
    let r = ''; for (const x of crypto.getRandomValues(new Uint8Array(10))) r += A[x % 32]; return r;
  };
  const audit = (batch, action, target) =>
    batch.set(doc(collection(db, 'auditLog')), { action, target: String(target).slice(0, 200), actor: me.uid, createdAt: serverTimestamp() });
  const inviteStatus = (i) => i.revoked ? 'ملغى'
    : (i.expiresAt && i.expiresAt.toDate() < new Date()) ? 'منتهي'
    : i.uses >= i.maxUses ? 'مستنفد' : 'فعّال';

  async function loadInvites() {
    try {
      const s = await getDocs(query(collection(db, 'invites'), orderBy('createdAt', 'desc')));
      const rows = s.docs.map((d) => { const i = d.data(), st = inviteStatus(i);
        return '<tr><td>' + esc(i.label) + '</td><td dir="ltr">' + esc(d.id.slice(0, 5) + '-' + d.id.slice(5)) +
          '</td><td>' + i.uses + ' / ' + i.maxUses + '</td><td>' + fmt(i.expiresAt) + '</td><td>' + st + '</td><td>' +
          '<button class="btn btn-small" data-copy="' + esc(d.id) + '">نسخ</button> ' +
          (st === 'فعّال' ? '<button class="btn btn-small btn-danger" data-revoke="' + esc(d.id) + '" data-label="' + esc(i.label) + '">إلغاء</button>' : '') +
          '</td></tr>'; });
      document.getElementById('invites-body').innerHTML = rows.join('') || '<tr><td colspan="6">لا توجد رموز بعد.</td></tr>';
    } catch (e) { fail('تعذّر تحميل الرموز.'); }
  }
  async function loadAccounts() {
    try {
      const s = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
      document.getElementById('count-accounts').textContent = s.size;
      document.getElementById('accounts-body').innerHTML = s.docs.map((d) => { const a = d.data();
        return '<tr><td>' + esc(a.fullName) + '</td><td>' + esc(a.grade || '—') + '</td><td>' + (a.isActive ? 'مفعّل' : 'معطّل') +
          '</td><td><button class="btn btn-small" data-toggle="' + esc(d.id) + '" data-to="' + (!a.isActive) + '">' +
          (a.isActive ? 'تعطيل' : 'تفعيل') + '</button></td></tr>'; }).join('') || '<tr><td colspan="4">لا توجد حسابات طالبات بعد.</td></tr>';
    } catch (e) { fail('تعذّر تحميل الحسابات.'); }
  }
  async function loadAudit() {
    try {
      const s = await getDocs(query(collection(db, 'auditLog'), orderBy('createdAt', 'desc'), limit(20)));
      document.getElementById('audit-body').innerHTML = s.docs.map((d) => { const a = d.data();
        return '<tr><td>' + (a.createdAt && a.createdAt.toDate ? a.createdAt.toDate().toLocaleString('ar') : '—') + '</td><td>' +
          esc(ACTIONS[a.action] || a.action) + '</td><td>' + esc(a.target) + '</td></tr>'; }).join('') ||
        '<tr><td colspan="3">لا توجد عمليات مسجّلة بعد.</td></tr>';
    } catch (e) {}
  }
  async function loadCounts() {
    try {
      const sn = await getDocs(query(collection(db, 'requests'), where('status', '==', 'new')));
      const c = {}; sn.docs.forEach((d) => { c[d.data().type] = (c[d.data().type] || 0) + 1; });
      document.getElementById('counts').innerHTML = TYPES.map((t) => '<a class="stat reveal" href="admin-requests.html?type=' + t + '&status=new"><span class="ic sm">' + ICONS[t] + '</span><strong>' + (c[t] || 0) + '</strong><small>' + esc(SERVICES[t].label) + ' — جديد</small></a>').join('');
      reveal(document);
    } catch (e) {}
  }
  const reload = () => { loadInvites(); loadAccounts(); loadAudit(); loadCounts(); };

  document.getElementById('form-invite').addEventListener('submit', async (e) => {
    e.preventDefault();
    const im = document.getElementById('msg-invite');
    const btn = e.target.querySelector('button[type=submit]');
    const label = document.getElementById('i-label').value.trim();
    const rawMax = document.getElementById('i-max').value.trim();
    const d = document.getElementById('i-exp').value;
    // عدد صحيح فقط: 1 أو 2 أو 3 ... (لا كسور ولا رموز)
    if (!label) return msg(im, 'error', 'اكتبي اسمًا للرمز.');
    if (!/^[0-9]+$/.test(rawMax) || Number(rawMax) < 1 || Number(rawMax) > 500)
      return msg(im, 'error', 'عدد الاستخدامات يجب أن يكون عددًا صحيحًا من 1 إلى 500 (مثل 1 أو 2 أو 30)، بدون كسور.');
    const max = Number(rawMax);
    if (d && new Date(d + 'T23:59:59') <= new Date()) return msg(im, 'error', 'تاريخ الانتهاء يجب أن يكون في المستقبل.');
    busy(btn, true, 'جارٍ الإنشاء…');
    try {
      const code = genCode(), bt = writeBatch(db);
      bt.set(doc(db, 'invites', code), { label, maxUses: max, uses: 0,
        expiresAt: d ? Timestamp.fromDate(new Date(d + 'T23:59:59')) : null,
        revoked: false, createdAt: serverTimestamp(), createdBy: me.uid });
      audit(bt, 'invite_created', label);
      await bt.commit();
      msg(im, 'success', 'تم إنشاء الرمز: ' + code.slice(0, 5) + '-' + code.slice(5) + ' (يظهر أيضًا في القائمة أدناه).');
      document.getElementById('i-label').value = ''; document.getElementById('i-exp').value = ''; document.getElementById('i-max').value = 30; reload();
    } catch (err) { msg(im, 'error', 'تعذّر إنشاء الرمز. تحققي من الاتصال وأعيدي المحاولة.'); }
    busy(btn, false);
  });

  document.getElementById('invites-body').addEventListener('click', async (e) => {
    const t = e.target.dataset || {};
    if (t.copy) { try { await navigator.clipboard.writeText(t.copy); msg(out, 'success', 'تم نسخ الرمز.'); } catch (_) { fail('تعذّر النسخ.'); } return; }
    if (!t.revoke) return;
    if (!confirm('إلغاء هذا الرمز نهائيًا؟ لن يستطيع أحد التسجيل به بعد ذلك.')) return;
    try { const b = writeBatch(db); b.update(doc(db, 'invites', t.revoke), { revoked: true }); audit(b, 'invite_revoked', t.label); await b.commit(); out.hidden = true; reload(); }
    catch (err) { fail('تعذّر إلغاء الرمز.'); }
  });
  document.getElementById('accounts-body').addEventListener('click', async (e) => {
    const t = e.target.dataset || {}; if (!t.toggle) return;
    const to = t.to === 'true';
    if (!confirm(to ? 'تفعيل هذا الحساب؟' : 'تعطيل هذا الحساب؟ لن تستطيع صاحبته استخدام البوابة.')) return;
    try { const b = writeBatch(db); b.update(doc(db, 'users', t.toggle), { isActive: to }); audit(b, to ? 'account_activated' : 'account_deactivated', t.toggle); await b.commit(); out.hidden = true; reload(); }
    catch (err) { fail('تعذّر تغيير حالة الحساب.'); }
  });
  reload();
}
