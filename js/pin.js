import { db, auditLog } from './app.js';
import { doc, setDoc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
export const DEFAULT_PIN = '0000';
export const DEFAULT_HASH = '68b07875ebf8f864b495e13a75ed69ad4eb00f4cbae91e2d9a7490b628aec6a8';
// بصمة الرمز (لا يُرسَل الرمز نفسه ولا يُخزَّن)
export async function pinHash(pin) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('parliament-portal-v1:' + pin));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
async function tryUnlock(uid, h) {
  const b = writeBatch(db);
  b.set(doc(db, 'adminUnlock', uid), { at: serverTimestamp(), pinHash: h });
  auditLog(b, uid, 'admin_unlocked', 'students');
  await b.commit();
}
// يعيد true إن صحّ الرمز (ويُفتح القفل 5 دقائق في الخادم)، وfalse إن كان خاطئًا
export async function unlockWithPin(uid, pin) {
  const h = await pinHash(pin);
  try { await tryUnlock(uid, h); return true; } catch (e) { if (e.code !== 'permission-denied') throw e; }
  try { await setDoc(doc(db, 'adminConfig', uid), { pinHash: DEFAULT_HASH, updatedAt: serverTimestamp() }); } catch (e) {}   // ينجح مرة واحدة فقط عند أول استخدام
  try { await tryUnlock(uid, h); return true; } catch (e) { if (e.code === 'permission-denied') return false; throw e; }
}
export async function changePin(uid, newPin) {
  const b = writeBatch(db);
  b.update(doc(db, 'adminConfig', uid), { pinHash: await pinHash(newPin), updatedAt: serverTimestamp() });
  auditLog(b, uid, 'pin_changed', 'settings');
  await b.commit();
}
