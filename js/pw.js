import { auth } from './app.js';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
export async function changeMyPassword(current, next) {
  const u = auth.currentUser;
  await reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, current));
  await updatePassword(u, next);
}
export const pwError = (e) => (e && (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential')) ? 'كلمة المرور الحالية غير صحيحة.'
  : (e && e.code === 'auth/weak-password') ? 'كلمة المرور الجديدة ضعيفة.'
  : (e && e.code === 'auth/too-many-requests') ? 'محاولات كثيرة. انتظري قليلًا.' : 'تعذّر تغيير كلمة المرور. أعيدي المحاولة.';
