import { db, initNav, esc, msg, busy } from './app.js';
import { collection, doc, getDocs, query, orderBy, limit, writeBatch, serverTimestamp, Timestamp }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const me = await initNav();
// التوجيه لتحسين التجربة فقط. قواعد قاعدة البيانات ترفض أي عملية إدارية من غير المديرة.
if (!me || !me.isAdmin) { location.replace('index.html'); }
else {
  document.getElementById('admin-main').hidden = false;
  const out = document.getElementById('msg');
  const fmt = (t) => (t && t.toDate) ? t.toDate().toLocaleDateString('ar') : '—';
  const ACTIONS = { invite_created: 'إنشاء رمز دعوة', invite_revoked: 'إلغاء رمز دعوة',
    account_activated: 'تفعيل حساب', account_deactivated: 'تعطيل حساب' };
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
  const reload = () => { loadInvites(); loadAccounts(); loadAudit(); };

  document.getElementById('form-invite').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type=submit]'); busy(btn, true, 'جارٍ الإنشاء…');
    const label = document.getElementById('i-label').value.trim();
    const max = parseInt(document.getElementById('i-max').value, 10);
    const d = document.getElementById('i-exp').value;
    try {
      if (!label || !(max >= 1 && max <= 500)) throw new Error('bad');
      const code = genCode(), b = writeBatch(db);
      b.set(doc(db, 'invites', code), { label, maxUses: max, uses: 0,
        expiresAt: d ? Timestamp.fromDate(new Date(d + 'T23:59:59')) : null,
        revoked: false, createdAt: serverTimestamp(), createdBy: me.uid });
      audit(b, 'invite_created', label);
      await b.commit();
      msg(out, 'success', 'تم إنشاء الرمز: ' + code.slice(0, 5) + '-' + code.slice(5) + ' (يظهر أيضًا في القائمة أدناه).');
      e.target.reset(); document.getElementById('i-max').value = 30; reload();
    } catch (err) { fail('تعذّر إنشاء الرمز. تأكدي من الاسم وعدد الاستخدامات (1 إلى 500) وأن تاريخ الانتهاء في المستقبل.'); }
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
