import { initNav, msg, busy } from './app.js';
import { unlockWithPin, changePin, DEFAULT_PIN } from './pin.js';
import { changeMyPassword, pwError } from './pw.js';
const me = await initNav();
if (!me || !me.isAdmin) location.replace('index.html');
else {
  document.getElementById('admin-main').hidden = false;
  const $ = (id) => document.getElementById(id);
  $('form-pin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur = $('p-cur').value, nw = $('p-new').value, m = $('msg-pin'), btn = e.target.querySelector('button[type=submit]');
    if (!cur) return msg(m, 'error', 'أدخلي رمز الحماية الحالي.');
    if (nw.length < 6) return msg(m, 'error', 'الرمز الجديد قصير. استخدمي 6 خانات على الأقل.');
    if (nw === DEFAULT_PIN) return msg(m, 'error', 'لا يمكن استخدام الرمز الافتراضي.');
    if (nw !== $('p-new2').value) return msg(m, 'error', 'الرمزان الجديدان غير متطابقين.');
    busy(btn, true, 'جارٍ التغيير…');
    try {
      if (!(await unlockWithPin(me.uid, cur))) { busy(btn, false); return msg(m, 'error', 'رمز الحماية الحالي غير صحيح.'); }
      await changePin(me.uid, nw);
      e.target.reset(); msg(m, 'success', 'تم تغيير رمز الحماية. استخدميه من الآن.');
    } catch (err) { msg(m, 'error', 'تعذّر التغيير. أعيدي المحاولة.'); }
    busy(btn, false);
  });
  $('form-pass').addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur = $('w-cur').value, nw = $('w-new').value, m = $('msg-pass'), btn = e.target.querySelector('button[type=submit]');
    if (!cur) return msg(m, 'error', 'أدخلي كلمة المرور الحالية.');
    if (nw.length < 10) return msg(m, 'error', 'كلمة المرور الجديدة قصيرة (10 خانات على الأقل).');
    if (nw !== $('w-new2').value) return msg(m, 'error', 'كلمتا المرور الجديدتان غير متطابقتين.');
    busy(btn, true, 'جارٍ التغيير…');
    try { await changeMyPassword(cur, nw); e.target.reset(); msg(m, 'success', 'تم تغيير كلمة مرور حسابك.'); }
    catch (err) { msg(m, 'error', pwError(err)); }
    busy(btn, false);
  });
}
