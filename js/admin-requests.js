import { db, initNav, esc, msg, busy, reveal, auditLog } from './app.js';
import { notifyBestEffort } from './push.js';
import { SERVICES, TYPES, ICONS, statusLabel, refCode, fmtDate, detailsHtml } from './services.js';
import { collection, query, orderBy, limit, getDocs, getDoc, doc, writeBatch, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const me = await initNav();
if (!me || !me.isAdmin) { location.replace('index.html'); }
else {
  document.getElementById('admin-main').hidden = false;
  const out = document.getElementById('msg'), list = document.getElementById('list'), counters = document.getElementById('counters');
  const fType = document.getElementById('f-type'), fStatus = document.getElementById('f-status'), fQ = document.getElementById('f-q'), fFrom = document.getElementById('f-from');
  const dlg = document.getElementById('dlg'), dBody = document.getElementById('dlg-body'), dMsg = document.getElementById('dlg-msg');
  let rows = [], cur = null, curNote = '';
  const qs = new URLSearchParams(location.search);

  fType.innerHTML = '<option value="">كل الأنواع</option>' + TYPES.map((t) => '<option value="' + t + '">' + esc(SERVICES[t].label) + '</option>').join('');
  const fillStatus = () => {
    const ss = fType.value ? SERVICES[fType.value].statuses : ['new', 'in_review', 'need_info', 'accepted', 'in_progress', 'done', 'rejected', 'referred', 'resolved', 'closed', 'answered', 'coordinating', 'completed'];
    const keep = fStatus.value;
    fStatus.innerHTML = '<option value="">كل الحالات</option>' + ss.map((s) => '<option value="' + s + '">' + esc(statusLabel(fType.value, s)) + '</option>').join('');
    if (ss.includes(keep)) fStatus.value = keep;
  };
  if (qs.get('type') && SERVICES[qs.get('type')]) fType.value = qs.get('type');
  fillStatus(); if (qs.get('status')) fStatus.value = qs.get('status');

  async function load() {
    try {
      const s = await getDocs(query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(300)));
      rows = s.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    } catch (e) { msg(out, 'error', 'تعذّر تحميل الطلبات.'); }
    render();
  }
  function render() {
    // عدّادات حقيقية من البيانات المحمّلة
    counters.innerHTML = TYPES.map((t) => {
      const all = rows.filter((r) => r.type === t), nw = all.filter((r) => r.status === 'new').length;
      return '<button type="button" class="stat reveal" data-type="' + t + '"><span class="ic sm">' + ICONS[t] + '</span><strong>' + nw + '</strong><small>' + esc(SERVICES[t].label) + ' — جديد (من ' + all.length + ')</small></button>';
    }).join('');
    const q = fQ.value.trim().toLowerCase(), from = fFrom.value ? new Date(fFrom.value + 'T00:00:00') : null;
    const items = rows.filter((r) => (!fType.value || r.type === fType.value) && (!fStatus.value || r.status === fStatus.value) &&
      (!from || (r.createdAt && r.createdAt.toDate() >= from)) &&
      (!q || (r.title + ' ' + r.ownerName + ' ' + refCode(r.id)).toLowerCase().includes(q)));
    list.innerHTML = items.length ? items.map((r) =>
      '<article class="req-row reveal"><span class="ic sm">' + ICONS[r.type] + '</span><div class="rt"><strong>' + esc(r.title) + '</strong><small>' + esc(SERVICES[r.type].label) + ' · ' + esc(r.ownerName) +
      ' · ' + fmtDate(r.createdAt) + ' · رقم ' + refCode(r.id) + '</small></div><span class="badge st-' + esc(r.status) + '">' + esc(statusLabel(r.type, r.status)) +
      '</span><button class="btn btn-small" data-open="' + esc(r.id) + '">فتح</button></article>').join('')
      : '<p class="empty">لا توجد طلبات مطابقة.</p>';
    reveal(document);
  }
  [fType, fStatus, fQ, fFrom].forEach((e) => e.addEventListener('input', () => { if (e === fType) fillStatus(); render(); }));
  counters.addEventListener('click', (e) => { const b = e.target.closest('[data-type]'); if (!b) return; fType.value = b.dataset.type; fillStatus(); fStatus.value = 'new'; render(); });

  list.addEventListener('click', async (e) => {
    const id = e.target.dataset && e.target.dataset.open; if (!id) return;
    cur = rows.find((r) => r.id === id); if (!cur) return;
    curNote = ''; try { const n = await getDoc(doc(db, 'adminNotes', id)); if (n.exists()) curNote = n.data().note || ''; } catch (err) {}
    const S = SERVICES[cur.type];
    dBody.innerHTML = '<h2>' + esc(cur.title) + '</h2><p class="note">' + esc(S.label) + ' · ' + esc(cur.ownerName) + ' · ' + fmtDate(cur.createdAt) + ' · رقم ' + refCode(cur.id) + '</p>' + detailsHtml(cur, esc) +
      '<div class="field"><label for="d-status">الحالة</label><select id="d-status">' + S.statuses.map((s) => '<option value="' + s + '"' + (s === cur.status ? ' selected' : '') + '>' + esc(statusLabel(cur.type, s)) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="d-reply">الرد <span class="opt">(يظهر للطالبة)</span></label><textarea id="d-reply" rows="4" maxlength="2000">' + esc(cur.reply || '') + '</textarea></div>' +
      (cur.type === 'meeting' ? '<div class="field"><label for="d-sched">الموعد النهائي والمكان <span class="opt">(يظهر للطالبة)</span></label><input id="d-sched" maxlength="200" value="' + esc(cur.schedule || '') + '"></div>' : '') +
      '<div class="field"><label for="d-note">ملاحظة داخلية <span class="opt">(لا تظهر للطالبة أبدًا)</span></label><textarea id="d-note" rows="3" maxlength="2000">' + esc(curNote) + '</textarea></div>';
    dMsg.hidden = true; dlg.showModal();
  });
  document.getElementById('dlg-close').onclick = () => dlg.close();
  document.getElementById('dlg-save').onclick = async (ev) => {
    const btn = ev.currentTarget; busy(btn, true, 'جارٍ الحفظ…');
    const status = document.getElementById('d-status').value, reply = document.getElementById('d-reply').value.trim();
    const note = document.getElementById('d-note').value.trim(), sEl = document.getElementById('d-sched');
    try {
      const b = writeBatch(db), upd = { status, reply, updatedAt: serverTimestamp() };
      if (sEl) upd.schedule = sEl.value.trim();
      b.update(doc(db, 'requests', cur.id), upd);
      if (note !== curNote) b.set(doc(db, 'adminNotes', cur.id), { note, updatedAt: serverTimestamp(), updatedBy: me.uid });
      let pushText = '';
      const changed = status !== cur.status || reply !== (cur.reply || '') || (sEl && sEl.value.trim() !== (cur.schedule || ''));
      if (changed) {
        const tt = cur.title.length > 60 ? cur.title.slice(0, 60) + '…' : cur.title;
        const text = pushText = (reply && reply !== (cur.reply || '')) ? 'وصلك ردّ على طلبك «' + tt + '». الحالة: ' + statusLabel(cur.type, status)
          : 'تم تحديث طلبك «' + tt + '». الحالة: ' + statusLabel(cur.type, status);
        b.set(doc(collection(db, 'notifications')), { userId: cur.ownerId, kind: 'request_update', requestId: cur.id, text, read: false, createdAt: serverTimestamp() });
      }
      auditLog(b, me.uid, 'request_updated', refCode(cur.id) + ' → ' + statusLabel(cur.type, status));
      await b.commit();
      if (pushText) notifyBestEffort({ type: 'user', targetUid: cur.ownerId, page: 'requests', title: 'تحديث على طلبك', body: pushText });
      cur.status = status; cur.reply = reply; if (sEl) cur.schedule = upd.schedule;
      busy(btn, false); dlg.close(); render(); msg(out, 'success', 'تم حفظ التعديلات.');
    } catch (err) { busy(btn, false); msg(dMsg, 'error', 'تعذّر حفظ التعديلات. أعيدي المحاولة.'); }
  };
  await load();
}
