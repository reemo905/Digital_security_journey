import { auth, db, toEmail, validUsername, msg, busy, getProfile } from './app.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, deleteUser, signOut }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { writeBatch, doc, serverTimestamp, increment }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const tabs = { login: document.getElementById('tab-login'), signup: document.getElementById('tab-signup') };
const forms = { login: document.getElementById('form-login'), signup: document.getElementById('form-signup') };
const out = document.getElementById('msg');
const $ = (id) => document.getElementById(id);

function show(which) {
  for (const k of ['login', 'signup']) { forms[k].hidden = k !== which; tabs[k].setAttribute('aria-selected', String(k === which)); }
  out.hidden = true;
}
tabs.login.onclick = () => show('login');
tabs.signup.onclick = () => show('signup');
getProfile().then((p) => { if (p && p.active) location.replace('index.html'); }).catch(() => {});

const netErr = (e) => e && (e.code === 'auth/network-request-failed' || e.code === 'unavailable');

forms.login.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = forms.login.querySelector('button[type=submit]'); busy(btn, true, 'جارٍ الدخول…');
  try {
    await signInWithEmailAndPassword(auth, toEmail($('l-user').value), $('l-pass').value);
  } catch (err) {
    msg(out, 'error', netErr(err) ? 'تعذّر الاتصال بالإنترنت. أعيدي المحاولة.'
      : err.code === 'auth/too-many-requests' ? 'محاولات كثيرة. انتظري قليلًا ثم أعيدي المحاولة.'
      : 'اسم المستخدم أو كلمة المرور غير صحيحة.');
    busy(btn, false); return;
  }
  const p = await getProfile();
  if (!p || !p.active) {
    await signOut(auth);
    msg(out, 'error', 'هذا الحساب غير مفعّل أو لم يكتمل إنشاؤه. تواصلي مع رئيسة البرلمان.');
    busy(btn, false); return;
  }
  location.href = 'index.html';
});

forms.signup.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = $('s-name').value.trim(), grade = $('s-grade').value.trim(), user = $('s-user').value.trim().toLowerCase();
  const pass = $('s-pass').value;
  const code = $('s-code').value.toUpperCase().replace(/[\s-]/g, '');
  if (name.length < 2 || name.length > 80) return msg(out, 'error', 'اكتبي اسمك (من حرفين إلى 80 حرفًا).');
  if (grade.length > 40) return msg(out, 'error', 'الصف طويل جدًا.');
  if (!validUsername(user) || user.includes('@')) return msg(out, 'error', 'اسم المستخدم: حروف إنجليزية صغيرة وأرقام (3 إلى 30)، ويمكن استخدام . أو _ أو -');
  if (pass.length < 10) return msg(out, 'error', 'كلمة المرور قصيرة. استخدمي 10 خانات على الأقل.');
  if (pass !== $('s-pass2').value) return msg(out, 'error', 'كلمتا المرور غير متطابقتين.');
  if (!/^[A-Z2-9]{10}$/.test(code)) return msg(out, 'error', 'رمز الدعوة يتكوّن من 10 أحرف وأرقام (مثل ABCDE-23456).');
  if (!$('s-agree').checked) return msg(out, 'error', 'يلزم الاطلاع على كيفية استخدام البيانات والموافقة عليها.');

  const btn = forms.signup.querySelector('button[type=submit]'); busy(btn, true, 'جارٍ إنشاء الحساب…');
  let cred;
  try { cred = await createUserWithEmailAndPassword(auth, toEmail(user), pass); }
  catch (err) {
    msg(out, 'error', netErr(err) ? 'تعذّر الاتصال بالإنترنت. أعيدي المحاولة.'
      : err.code === 'auth/email-already-in-use' ? 'اسم المستخدم هذا مستخدم. اختاري اسمًا آخر.'
      : err.code === 'auth/too-many-requests' ? 'محاولات كثيرة. انتظري قليلًا.'
      : 'تعذّر إنشاء الحساب. تحققي من البيانات وأعيدي المحاولة.');
    busy(btn, false); return;   // لا نمسح الحقول عند الخطأ
  }
  try {
    // عملية واحدة: إنشاء ملف الطالبة + زيادة عدّاد الرمز. القواعد ترفضها كلها إن كان الرمز غير صالح.
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', cred.user.uid),
      { fullName: name, grade: grade, isActive: true, inviteCode: code, createdAt: serverTimestamp() });
    batch.update(doc(db, 'invites', code), { uses: increment(1) });
    await batch.commit();
  } catch (err) {
    try { await deleteUser(cred.user); } catch (_) {}   // لا نترك حسابًا فارغًا
    msg(out, 'error', netErr(err) ? 'تعذّر الاتصال بالإنترنت. أعيدي المحاولة.'
      : 'رمز الدعوة غير صحيح أو منتهٍ أو استُنفد. اطلبي رمزًا جديدًا من رئيسة البرلمان.');
    busy(btn, false); return;
  }
  location.href = 'index.html';
});
