import { db, initNav, esc, msg, busy, reveal } from './app.js';
import { fdt } from './content.js';
import { collection, query, where, getDocs, getDoc, doc, writeBatch, serverTimestamp, increment } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const p = await initNav();
if (!p) location.replace('login.html');
else {
  const out = document.getElementById('msg'), list = document.getElementById('list');
  let rows = [];
  try {
    const s = await getDocs(query(collection(db, 'polls'), where('published', '==', true)));
    rows = s.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    if (!p.isAdmin) await Promise.all(rows.map(async (r) => { try { r.voted = (await getDoc(doc(db, 'polls', r.id, 'votes', p.uid))).exists(); } catch (e) { r.voted = false; } }));
  } catch (e) { msg(out, 'error', 'تعذّر تحميل التصويتات.'); }
  rows.sort((a, b) => b.endsAt.toMillis() - a.endsAt.toMillis());
  const state = (r) => { const n = Date.now();
    return r.closed ? 'closed' : n < r.startsAt.toMillis() ? 'soon' : n > r.endsAt.toMillis() ? 'ended' : 'open'; };
  const LBL = { closed: 'مغلق', soon: 'لم يبدأ بعد', ended: 'انتهى', open: 'جارٍ الآن' };
  function render() {
    list.innerHTML = rows.length ? rows.map((r) => { const st = state(r), show = r.showResults === 'always' || st === 'closed' || st === 'ended';
      return '<article class="panel reveal"><span class="badge ' + (st === 'open' ? 'st-accepted' : 'st-closed') + '">' + LBL[st] + '</span><h2>' + esc(r.title) + '</h2><p class="pre">' + esc(r.description) + '</p>' +
        '<p class="note">من ' + fdt(r.startsAt) + ' إلى ' + fdt(r.endsAt) + '</p>' +
        '<p class="votes">' + (show ? 'عدد المؤيّدات: <strong>' + r.voteCount + '</strong>' : 'ستظهر النتيجة بعد انتهاء التصويت.') + '</p>' +
        (p.isAdmin ? '' : r.voted ? '<p class="msg msg-success">تم تسجيل صوتك.</p>'
          : st === 'open' ? '<button class="btn btn-small" data-vote="' + esc(r.id) + '">أؤيّد هذه الفكرة</button><div class="msg" id="m-' + esc(r.id) + '" role="alert" hidden></div>' : '') + '</article>'; }).join('')
      : '<p class="empty">لا توجد تصويتات منشورة حاليًا.</p>';
    reveal(list);
  }
  list.addEventListener('click', async (e) => {
    const id = e.target.dataset && e.target.dataset.vote; if (!id) return;
    const r = rows.find((x) => x.id === id), btn = e.target, m = document.getElementById('m-' + id);
    busy(btn, true, 'جارٍ التسجيل…');
    try {
      const b = writeBatch(db);
      b.set(doc(db, 'polls', id, 'votes', p.uid), { createdAt: serverTimestamp() });
      b.update(doc(db, 'polls', id), { voteCount: increment(1) });
      await b.commit(); r.voted = true; r.voteCount += 1; render();
    } catch (err) { busy(btn, false); msg(m, 'error', 'تعذّر تسجيل صوتك. ربما صوّتِّ سابقًا أو انتهى التصويت أو انقطع الاتصال.'); }
  });
  render();
}
