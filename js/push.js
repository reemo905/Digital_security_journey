import { app, auth } from './app.js';
import { pushConfig } from './firebase-config.js';
import { getMessaging, getToken, deleteToken, isSupported } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js';

export const pushConfigured = () => !!(pushConfig.workerUrl && pushConfig.vapidKey);

async function call(path, payload) {
  const t = await auth.currentUser.getIdToken();
  return fetch(pushConfig.workerUrl.replace(/\/$/, '') + path, { method: 'POST', keepalive: true,
    headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}
// إرسال إشعار Push "بأفضل جهد": فشله لا يمنع نجاح العملية الأصلية
export function notifyBestEffort(payload) {
  if (!pushConfigured() || !auth.currentUser) return Promise.resolve();
  return Promise.race([call('/notify', payload).catch(() => {}), new Promise((r) => setTimeout(r, 3000))]);
}

export async function enablePush() {
  if (!(await isSupported())) throw new Error('unsupported');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('denied');
  const reg = await navigator.serviceWorker.register('firebase-messaging-sw.js');
  await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), { vapidKey: pushConfig.vapidKey, serviceWorkerRegistration: reg });
  if (!token) throw new Error('no-token');
  const r = await call('/register', { token });
  if (!r.ok) throw new Error('register-failed');
  try { localStorage.setItem('pushToken', token); } catch (e) {}
  return true;
}
export async function disablePush() {
  let token = ''; try { token = localStorage.getItem('pushToken') || ''; } catch (e) {}
  if (token) { try { await call('/unregister', { token }); } catch (e) {} }
  try { await deleteToken(getMessaging(app)); } catch (e) {}
  try { localStorage.removeItem('pushToken'); } catch (e) {}
}

// صندوق تفعيل الإشعارات الفورية في صفحة الإشعارات
export async function mountPushBox(el) {
  if (!pushConfigured()) { el.innerHTML = '<p class="note">الإشعارات الفورية على الهاتف غير مفعّلة في هذا الموقع بعد. الإشعارات داخل الموقع تعمل دائمًا.</p>'; return; }
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent), standalone = window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches;
  let ok = false; try { ok = await isSupported(); } catch (e) {}
  if (ios && !standalone) { el.innerHTML = '<p class="note">على الآيفون: افتحي الموقع في Safari ثم «مشاركة» ← «إضافة إلى الشاشة الرئيسية»، وافتحيه من الأيقونة، ثم فعّلي الإشعارات من هنا.</p>'; return; }
  if (!ok) { el.innerHTML = '<p class="note">هذا المتصفح لا يدعم الإشعارات الفورية.</p>'; return; }
  const on = () => { try { return !!localStorage.getItem('pushToken') && Notification.permission === 'granted'; } catch (e) { return false; } };
  const draw = (m) => {
    el.innerHTML = '<p>' + (on() ? 'الإشعارات الفورية <strong>مفعّلة</strong> على هذا الجهاز.' : 'فعّلي الإشعارات الفورية لتصلكِ تنبيهات حتى والموقع مغلق.') + '</p>' +
      '<button class="btn btn-small" id="push-btn" type="button">' + (on() ? 'إيقاف الإشعارات على هذا الجهاز' : 'تفعيل الإشعارات على هذا الجهاز') + '</button>' +
      (Notification.permission === 'denied' ? '<p class="note">الإذن محظور في المتصفح؛ فعّليه من إعدادات الموقع ثم أعيدي المحاولة.</p>' : '') + (m ? '<p class="note">' + m + '</p>' : '');
    document.getElementById('push-btn').onclick = async (e) => {
      const b = e.currentTarget; b.disabled = true; b.textContent = 'جارٍ التنفيذ…';
      try { if (on()) { await disablePush(); draw(''); } else { await enablePush(); draw('تم التفعيل.'); } }
      catch (err) { draw(err.message === 'denied' ? 'لم يُمنح الإذن.' : 'تعذّر التفعيل. تأكدي من إعداد الخدمة أو أعيدي المحاولة لاحقًا.'); }
    };
  };
  draw('');
}
