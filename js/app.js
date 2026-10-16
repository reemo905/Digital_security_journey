import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut as fbSignOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// الطالبات يدخلن باسم مستخدم؛ نحوّله داخليًا إلى بريد شكلي (لا يُرسَل إليه شيء).
const DOMAIN = 'portal.local';
export const validUsername = (u) => /^[a-z0-9._-]{3,30}$/.test(u.trim().toLowerCase());
export const toEmail = (u) => { u = u.trim().toLowerCase(); return u.includes('@') ? u : u + '@' + DOMAIN; };

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// الرسالة تظهر ثم تُمرَّر الشاشة إليها، حتى تراها مستخدمة الهاتف
export function msg(el, type, text) {
  el.className = 'msg msg-' + type; el.textContent = text; el.hidden = false;
  try { el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); } catch (e) {}
}
// ظهور تدريجي للعناصر عند التمرير
document.documentElement.classList.add('js');
export function reveal(root) {
  const els = (root || document).querySelectorAll('.reveal:not(.in)');
  if (!('IntersectionObserver' in window) || reduce) { els.forEach((e) => e.classList.add('in')); return; }
  const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: 0.08 });
  els.forEach((e, i) => { e.style.transitionDelay = Math.min(i * 60, 360) + 'ms'; io.observe(e); });
}
export function auditLog(batch, actorUid, action, target) {
  batch.set(doc(collection(db, 'auditLog')), { action, target: String(target).slice(0, 200), actor: actorUid, createdAt: serverTimestamp() });
}
export function busy(btn, on, label) {
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'جارٍ التنفيذ…'; btn.disabled = true; btn.classList.add('loading'); }
  else { btn.textContent = btn.dataset.label || btn.textContent; btn.disabled = false; btn.classList.remove('loading'); }
}
export function authReady() {
  return new Promise((res) => { const off = onAuthStateChanged(auth, (u) => { off(); res(u); }); });
}
export async function getProfile() {
  const user = await authReady();
  if (!user) return null;
  let isAdmin = false, data = null;
  try { isAdmin = (await getDoc(doc(db, 'admins', user.uid))).exists(); } catch (e) {}
  try { const s = await getDoc(doc(db, 'users', user.uid)); data = s.exists() ? s.data() : null; } catch (e) {}
  return { uid: user.uid, isAdmin,
    fullName: data ? data.fullName : (isAdmin ? 'رئيسة البرلمان' : ''),
    active: isAdmin || !!(data && data.isActive === true) };
}
export async function signOut() { await fbSignOut(auth); location.href = 'login.html'; }

// ضبط شريط التنقل (لتحسين التجربة فقط؛ الحماية الحقيقية في قواعد قاعدة البيانات)
export async function initNav() {
  let p = null;
  try { p = await getProfile(); } catch (e) { p = null; }
  if (p && !p.active) { await fbSignOut(auth); p = null; }
  const show = (id, v) => { const e = document.getElementById(id); if (e) e.hidden = !v; };
  show('nav-login', !p); show('nav-logout', !!p); show('nav-requests', !!p && !p.isAdmin); show('nav-admin', !!(p && p.isAdmin));
  const out = document.getElementById('nav-logout');
  if (out) out.onclick = (ev) => { ev.preventDefault(); signOut(); };
  window.addEventListener('scroll', () => document.body.classList.toggle('scrolled', window.scrollY > 4), { passive: true });
  reveal();
  return p;
}
