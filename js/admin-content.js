import { db, initNav, esc, msg, busy, reveal, auditLog } from './app.js';
import { CONTENT, fdate, fdt, toInputDate, toInputDT } from './content.js';
import { collection, doc, getDocs, query, orderBy, writeBatch, serverTimestamp, Timestamp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
const me = await initNav();
const name = new URLSearchParams(location.search).get('c'), C = CONTENT[name];
if (!me || !me.isAdmin || !C) { location.replace('index.html'); }
else {
  document.getElementById('admin-main').hidden = false;
  document.getElementById('h').textContent = 'إدارة: ' + C.label;
  document.getElementById('tabs').innerHTML = Object.keys(CONTENT).map((k) => '<a class="btn btn-small ' + (k === name ? '' : 'btn-ghost') + '" href="admin-content.html?c=' + k + '">' + esc(CONTENT[k].label) + '</a>').join(' ');
  const out = document.getElementById('msg'), list = document.getElementById('list'), dlg = document.getElementById('dlg'), body = document.getElementById('dlg-body'), dMsg = document.getElementById('dlg-msg');
  let rows = [], cur = null;
  const title = (r) => r[C.titleKey];
  async function load() {
    try { rows = (await getDocs(query(collection(db, name), orderBy('createdAt', 'desc')))).docs.map((d) => Object.assign({ id: d.id }, d.data())); }
    catch (e) { msg(out, 'error', 'تعذّر تحميل المحتوى.'); }
    list.innerHTML = rows.length ? rows.map((r) => '<article class="req-row reveal"><div class="rt"><strong>' + esc(title(r)) + '</strong><small>' +
      (name === 'polls' ? 'من ' + fdt(r.startsAt) + ' إلى ' + fdt(r.endsAt) + ' · الأصوات: ' + r.voteCount : fdate(r.createdAt)) + '</small></div>' +
      (C.publishable ? '<span class="badge ' + (r.published ? 'st-accepted' : 'st-closed') + '">' + (r.published ? 'منشور' : 'مسودة') + '</span>' : '') +
      '<button class="btn btn-small" data-edit="' + esc(r.id) + '">تعديل</button>' +
      (C.publishable ? '<button class="btn btn-small btn-ghost" data-pub="' + esc(r.id) + '">' + (r.published ? 'إلغاء النشر' : 'نشر') + '</button>' : '') +
      '<button class="btn btn-small btn-danger" data-del="' + esc(r.id) + '">حذف</button></article>').join('') : '<p class="empty">لا يوجد محتوى بعد.</p>';
    reveal(list);
  }
  const ctl = (f, v) => {
    const id = 'c-' + f.k;
    if (f.type === 'textarea') return '<textarea id="' + id + '" rows="4" maxlength="' + f.max + '">' + esc(v) + '</textarea>';
    if (f.type === 'select') return '<select id="' + id + '">' + (f.required ? '<option value="">اختاري…</option>' : '') + f.options.map((o) => '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
    if (f.type === 'bool') return '<select id="' + id + '"><option value="false"' + (v !== 'true' ? ' selected' : '') + '>لا</option><option value="true"' + (v === 'true' ? ' selected' : '') + '>نعم</option></select>';
    if (f.type === 'date') return '<input id="' + id + '" type="date" value="' + esc(v) + '">';
    if (f.type === 'datetime') return '<input id="' + id + '" type="datetime-local" value="' + esc(v) + '">';
    if (f.type === 'int') return '<input id="' + id + '" type="number" min="' + f.min + '" max="' + f.max + '" step="1" inputmode="numeric" value="' + esc(v) + '">';
    return '<input id="' + id + '" maxlength="' + f.max + '" value="' + esc(v) + '">';
  };
  const initial = (f, r) => { if (!r) return f.def || ''; const v = r[f.k];
    return f.type === 'date' ? toInputDate(v) : f.type === 'datetime' ? toInputDT(v) : f.type === 'bool' ? String(!!v) : v == null ? '' : String(v); };
  function openForm(r) {
    cur = r;
    body.innerHTML = '<h2>' + (r ? 'تعديل' : 'إضافة') + ' ' + esc(C.one) + '</h2>' + C.fields.map((f) =>
      '<div class="field"><label for="c-' + f.k + '">' + esc(f.label) + ' ' + (f.required ? '<span class="req">(مطلوب)</span>' : '<span class="opt">(اختياري)</span>') + '</label>' + ctl(f, initial(f, r)) + '<p class="ferr" id="e-' + f.k + '" hidden></p></div>').join('') +
      (C.publishable ? '<div class="field"><label for="c-pub">حالة النشر</label><select id="c-pub"><option value="false"' + (r && r.published ? '' : ' selected') + '>مسودة (غير منشور)</option><option value="true"' + (r && r.published ? ' selected' : '') + '>منشور للطالبات</option></select></div>' : '') +
      '<p class="note">لا تكتبي أسماء طالبات أو بيانات شخصية في المحتوى المنشور.</p>';
    dMsg.hidden = true; dlg.showModal();
  }
  function parse(f) {
    const el = document.getElementById('c-' + f.k), v = el.value.trim();
    if (!v) return f.required ? { err: 'هذا الحقل مطلوب.' } : { val: f.type === 'date' || f.type === 'datetime' ? null : '' };
    if (f.type === 'int') return (/^[0-9]+$/.test(v) && +v >= f.min && +v <= f.max) ? { val: +v } : { err: 'عدد صحيح من ' + f.min + ' إلى ' + f.max + '.' };
    if (f.type === 'date') return { val: Timestamp.fromDate(new Date(v + (f.end ? 'T23:59:59' : 'T00:00:00'))) };
    if (f.type === 'datetime') return { val: Timestamp.fromDate(new Date(v)) };
    if (f.type === 'bool') return { val: v === 'true' };
    if (f.min && v.length < f.min) return { err: 'اكتبي ' + f.min + ' أحرف على الأقل.' };
    return { val: v };
  }
  document.getElementById('add').onclick = () => openForm(null);
  document.getElementById('dlg-close').onclick = () => dlg.close();
  document.getElementById('dlg-save').onclick = async (ev) => {
    const data = {}; let bad = 0;
    C.fields.forEach((f) => { const r = parse(f), e = document.getElementById('e-' + f.k); e.hidden = !r.err; e.textContent = r.err || ''; if (r.err) bad++; else data[f.k] = r.val; });
    if (!bad && name === 'initiatives' && data.endDate < data.startDate) { bad++; msg(dMsg, 'error', 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية.'); return; }
    if (!bad && name === 'polls' && data.endsAt <= data.startsAt) { bad++; msg(dMsg, 'error', 'نهاية التصويت يجب أن تكون بعد بدايته.'); return; }
    if (bad) return msg(dMsg, 'error', 'يوجد ' + bad + ' من الحقول تحتاج إلى تصحيح.');
    const btn = ev.currentTarget; busy(btn, true, 'جارٍ الحفظ…');
    try {
      const b = writeBatch(db);
      if (C.publishable) { data.published = document.getElementById('c-pub').value === 'true';
        if (name === 'announcements') data.publishedAt = data.published ? ((cur && cur.published && cur.publishedAt) || serverTimestamp()) : null; }
      if (!cur) { const full = Object.assign({}, data, { createdAt: serverTimestamp(), updatedAt: serverTimestamp(), createdBy: me.uid }); if (name === 'polls') full.voteCount = 0; b.set(doc(collection(db, name)), full); }
      else b.update(doc(db, name, cur.id), Object.assign({}, data, { updatedAt: serverTimestamp() }));
      auditLog(b, me.uid, 'content_saved', name + ': ' + String(data[C.titleKey]).slice(0, 80));
      await b.commit(); busy(btn, false); dlg.close(); msg(out, 'success', 'تم الحفظ.'); load();
    } catch (err) { busy(btn, false); msg(dMsg, 'error', 'تعذّر الحفظ. تحققي من الاتصال والحقول وأعيدي المحاولة.'); }
  };
  list.addEventListener('click', async (e) => {
    const t = e.target.dataset || {}, id = t.edit || t.pub || t.del; if (!id) return;
    const r = rows.find((x) => x.id === id); if (!r) return;
    if (t.edit) return openForm(r);
    try {
      const b = writeBatch(db);
      if (t.del) { if (!confirm('حذف «' + title(r) + '» نهائيًا؟ لا يمكن التراجع.')) return; b.delete(doc(db, name, id)); auditLog(b, me.uid, 'content_deleted', name + ': ' + String(title(r)).slice(0, 80)); }
      else { const upd = { published: !r.published, updatedAt: serverTimestamp() }; if (name === 'announcements') upd.publishedAt = !r.published ? serverTimestamp() : null;
        b.update(doc(db, name, id), upd); auditLog(b, me.uid, r.published ? 'content_unpublished' : 'content_published', name + ': ' + String(title(r)).slice(0, 80)); }
      await b.commit(); out.hidden = true; load();
    } catch (err) { msg(out, 'error', 'تعذّرت العملية.'); }
  });
  await load();
}
