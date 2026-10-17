// عامل الخلفية للإشعارات الفورية (Service Worker). القيم أدناه ليست أسرارًا.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js', 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');
firebase.initializeApp({
  apiKey: "AIzaSyBR4zg6zv8wzSLQBLDQeXGeF5u45bZiKu8",
  authDomain: "parliament-portal-904f3.firebaseapp.com",
  projectId: "parliament-portal-904f3",
  messagingSenderId: "620093578318",
  appId: "1:620093578318:web:8723f8218b3f04eb7c371f"
});
firebase.messaging();   // يعرض الإشعارات الواردة في الخلفية تلقائيًا، وعند النقر يفتح الرابط المرفق
