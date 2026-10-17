import { db, auditLog } from './app.js';
import { doc, getDoc, setDoc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
export const DEFAULT_PIN = '0000';
export const DEFAULT_HASH = '68b07875ebf8f864b495e13a75ed69ad4eb00f4cbae91e2d9a7490b628aec6a8';
// يحوّل الأرقام العربية (٠١٢٣…) والفارسية (۰۱۲۳…) إلى أرقام إنجليزية، حتى لا يفشل الرمز بسبب لوحة المفاتيح
export const normPin = (p) => String(p == null ? '' : p).trim()
  .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
// بصمة الرمز (لا يُرسَل الرمز نفسه ولا يُخزَّن)
export async function pinHash(pin) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('parliament-portal-v1:' + normPin(pin)));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export const UNLOCK_ERR = {
  wrong: 'رمز الحماية غير صحيح.',
  rules: 'قواعد قاعدة البيانات غير محدَّثة. افتحي ملف firebase/firestore.rules الجديد، وانسخي كل محتواه والصقيه في Firebase ← Firestore ← Rules ← Publish، ثم أعيدي المحاولة.',
  network: 'تعذّر الاتصال بقاعدة البيانات. تأكدي من الإنترنت وأعيدي المحاولة.'
};
async function tryUnlock(uid, h) {
  const b = writeBatch(db);
  b.set(doc(db, 'adminUnlock', uid), { unlockedAt: serverTimestamp(), pinHash: h });
  auditLog(b, uid, 'admin_unlocked', 'students');
  await b.commit();
}
const kind = (e) => (e && e.code === 'permission-denied') ? 'rules' : 'network';
// النتيجة: { ok: true } أو { ok: false, reason: 'wrong' | 'rules' | 'network' }
export async function unlockWithPin(uid, pin) {
  const h = await pinHash(pin);
  let st;
  try { st = await getDoc(doc(db, 'adminState', uid)); }
  catch (e) { return { ok: false, reason: kind(e) }; }      // رفض هنا = القواعد الجديدة غير منشورة
  if (!st.exists()) {                                        // أول استخدام: نُنشئ الرمز الافتراضي 0000
    try {
      const b = writeBatch(db);
      b.set(doc(db, 'adminConfig', uid), { pinHash: DEFAULT_HASH, updatedAt: serverTimestamp() });
      b.set(doc(db, 'adminState', uid), { configured: true });
      await b.commit();
    } catch (e) {
      try { await setDoc(doc(db, 'adminState', uid), { configured: true }); }   // ربما الرمز موجود من محاولة سابقة
      catch (e2) { return { ok: false, reason: kind(e2) }; }
    }
  }
  try { await tryUnlock(uid, h); return { ok: true }; }
  catch (e) { return { ok: false, reason: (e && e.code === 'permission-denied') ? 'wrong' : 'network' }; }
}
export async function changePin(uid, newPin) {
  const b = writeBatch(db);
  b.update(doc(db, 'adminConfig', uid), { pinHash: await pinHash(newPin), updatedAt: serverTimestamp() });
  auditLog(b, uid, 'pin_changed', 'settings');
  await b.commit();
}
