import { db, initNav, msg, busy } from './app.js';
import { changeMyPassword, pwError } from './pw.js';
import { doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const p = await initNav();
if (!p) location.replace('login.html'); else if (p.isAdmin) location.replace('admin-settings.html');
else {
  const $ = (id) => document.getElementById(id);
  let grade = ''; try { const { getDoc } = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js'); const s = await getDoc(doc(db, 'users', p.uid)); grade = s.exists() ? (s.data().grade || '') : ''; } catch (e) {}
  $('a-name').value = p.fullName; $('a-grade').value = grade;
  $('form-profile').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = $('a-name').value.trim(), g = $('a-grade').value.trim(), m = $('msg-profile'), btn = e.target.querySelector('button[type=submit]');
    if (name.length < 2 || name.length > 80) return msg(m, 'error', 'الاسم من حرفين إلى 80 حرفًا.');
    if (g.length > 40) return msg(m, 'error', 'الصف طويل جدًا.');
    busy(btn, true, 'جارٍ الحفظ…');
    try { await updateDoc(doc(db, 'users', p.uid), { fullName: name, grade: g }); msg(m, 'success', 'تم حفظ بياناتك.'); }
    catch (err) { msg(m, 'error', 'تعذّر الحفظ. أعيدي المحاولة.'); }
    busy(btn, false);
  });
  $('form-pass').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur = $('w-cur').value, nw = $('w-new').value, m = $('msg-pass'), btn = e.target.querySelector('button[type=submit]');
    if (!cur) return msg(m, 'error', 'أدخلي كلمة المرور الحالية.');
    if (nw.length < 10) return msg(m, 'error', 'كلمة المرور الجديدة قصيرة (10 خانات على الأقل).');
    if (nw !== $('w-new2').value) return msg(m, 'error', 'كلمتا المرور الجديدتان غير متطابقتين.');
    busy(btn, true, 'جارٍ التغيير…');
    try { await changeMyPassword(cur, nw); e.target.reset(); msg(m, 'success', 'تم تغيير كلمة المرور.'); }
    catch (err) { msg(m, 'error', pwError(err)); }
    busy(btn, false);
  });
}
