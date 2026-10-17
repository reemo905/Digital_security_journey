// إعدادات مشروعك. هذه القيم ليست أسرارًا؛ الحماية الفعلية في قواعد Firestore.
export const firebaseConfig = {
  apiKey: "AIzaSyBR4zg6zv8wzSLQBLDQeXGeF5u45bZiKu8",
  authDomain: "parliament-portal-904f3.firebaseapp.com",
  projectId: "parliament-portal-904f3",
  messagingSenderId: "620093578318",
  appId: "1:620093578318:web:8723f8218b3f04eb7c371f"
};

// إعدادات الإشعارات الفورية (Push). اتركيهما فارغين إن لم تُعدّي الخدمة بعد؛ ستعمل الإشعارات داخل الموقع فقط.
// الخطوات الكاملة في PUSH_SETUP.md
export const pushConfig = {
  workerUrl: "",   // رابط الـ Worker مثل https://parliament-push.xxxx.workers.dev
  vapidKey: ""     // Web Push certificate (Key pair) من Firebase > Project settings > Cloud Messaging
};
