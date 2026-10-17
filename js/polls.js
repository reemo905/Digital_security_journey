import { db, initNav, esc, msg, busy, reveal } from './app.js';
import { fdt } from './content.js';
import { collection, query, where, onSnapshot, getDoc, doc, writeBatch, serverTimestamp, increment } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const p = await initNav();
if (!p) location.replace('login.html');
else {
  const out = document.getElementById('msg'), list = document.getElementById('list'), live = document.getElementById('live');
  let rows = [], voted = {}, sig = null, prev = {};
  const state = (r) => { const n = Date.now(); return r.closed ? 'closed' : n < r.startsAt.toMillis() ? 'soon' : n > r.endsAt.toMillis() ? 'ended' : 'open'; };
  const LBL = { closed: 'مغلق', soon: 'لم يبدأ بعد', ended: 'انتهى', open: 'جارٍ الآن' };
  const clock = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    return (d ? d + ' يوم و ' : '') + [h, m, s % 60].map((n) => String(n).padStart(2, '0')).join(':'); };
  function render() {
    list.innerHTML = rows.length ? rows.map((r) => { const st = state(r), show = r.showResults === 'always' || st === 'closed' || st === 'ended';
      return '<article class="panel reveal in"><span class="badge ' + (st === 'open' ? 'st-accepted' : 'st-closed') + '">' + LBL[st] + '</span><h2>' + esc(r.title) + '</h2><p class="pre">' + esc(r.description) + '</p>' +
        '<p class="note">من ' + fdt(r.startsAt) + ' إلى ' + fdt(r.endsAt) + '</p>' +
        ((st === 'open' || st === 'soon') ? '<p class="cooldown cd" data-id="' + esc(r.id) + '"></p>' : '') +
        '<p class="votes">' + (show ? 'عدد المؤيّدات: <strong>' + r.voteCount + '</strong>' : 'ستظهر النتيجة بعد انتهاء التصويت.') + '</p>' +
        (p.isAdmin ? '' : voted[r.id] ? '<p class="msg msg-success">تم تسجيل صوتك.</p>'
          : st === 'open' ? '<button class="btn btn-small" data-vote="' + esc(r.id) + '">أؤيّد هذه الفكرة</button><div class="msg" id="m-' + esc(r.id) + '" role="alert" hidden></div>' : '') + '</article>'; }).join('')
      : '<p class="empty">لا توجد تصويتات منشورة حاليًا.</p>';
  }
  // مؤقّت كل ثانية: يعيد الرسم تلقائيًا عند بدء التصويت أو انتهائه أو إغلاقه، ويحدّث العدّ التنازلي
  function tick() {
    const s = rows.map((r) => r.id + ':' + state(r) + ':' + r.voteCount + ':' + !!voted[r.id]).join('|');
    if (s !== sig) {
      rows.forEach((r) => { const st = state(r);
        if (prev[r.id] === 'open' && st !== 'open') live.textContent = (st === 'closed' ? 'أُغلق التصويت على «' : 'انتهى التصويت على «') + r.title + '».';
        if (prev[r.id] === 'soon' && st === 'open') live.textContent = 'بدأ التصويت على «' + r.title + '».';
        prev[r.id] = st; });
      sig = s; render();
    }
    document.querySelectorAll('.cd').forEach((e) => { const r = rows.find((x) => x.id === e.dataset.id); if (!r) return; const st = state(r), n = Date.now();
      e.textContent = st === 'open' ? 'ينتهي التصويت بعد ' + clock(r.endsAt.toMillis() - n) : 'يبدأ التصويت بعد ' + clock(r.startsAt.toMillis() - n); });
  }
  setInterval(tick, 1000);
  // تحديث لحظي لأي تغيير تجريه المديرة (نشر، إغلاق، تعديل المواعيد) وللأعداد
  onSnapshot(query(collection(db, 'polls'), where('published', '==', true)), async (sn) => {
    rows = sn.docs.map((d) => Object.assign({ id: d.id }, d.data())).sort((a, b) => b.endsAt.toMillis() - a.endsAt.toMillis());
    if (!p.isAdmin) await Promise.all(rows.filter((r) => !(r.id in voted)).map(async (r) => {
      try { voted[r.id] = (await getDoc(doc(db, 'polls', r.id, 'votes', p.uid))).exists(); } catch (e) { voted[r.id] = false; } }));
    tick();
  }, () => msg(out, 'error', 'تعذّر تحميل التصويتات.'));
  list.addEventListener('click', async (e) => {
    const id = e.target.dataset && e.target.dataset.vote; if (!id) return;
    const btn = e.target, m = document.getElementById('m-' + id);
    busy(btn, true, 'جارٍ التسجيل…');
    try {
      const b = writeBatch(db);
      b.set(doc(db, 'polls', id, 'votes', p.uid), { createdAt: serverTimestamp() });
      b.update(doc(db, 'polls', id), { voteCount: increment(1) });
      await b.commit(); voted[id] = true; tick();
    } catch (err) { busy(btn, false); msg(m, 'error', 'تعذّر تسجيل صوتك. ربما صوّتِّ سابقًا أو انتهى التصويت أو انقطع الاتصال.'); }
  });
}
