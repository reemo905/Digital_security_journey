// تعريف أنواع المحتوى. أسماء الحقول والقيم يجب أن تطابق قواعد Firestore.
export const KIND = [['event', 'فعالية'], ['suggestions_open', 'فتح باب الاقتراحات'], ['contest', 'مسابقة'], ['schedule', 'موعد معتمد'], ['results', 'نتائج مبادرة'], ['other', 'أخرى']];
const t = (k, label, min, max, req) => ({ k, label, type: 'textarea', min, max, required: req });
export const CONTENT = {
  announcements: { label: 'الإعلانات', one: 'إعلان', publishable: true, titleKey: 'title',
    fields: [{ k: 'title', label: 'العنوان', type: 'text', min: 3, max: 120, required: true },
      { k: 'kind', label: 'نوع الإعلان', type: 'select', required: true, options: KIND },
      t('body', 'النص', 3, 3000, true),
      { k: 'expiresAt', label: 'تاريخ الانتهاء', type: 'date', end: true, required: false }] },
  achievements: { label: 'إنجازات البرلمان', one: 'إنجاز', publishable: true, titleKey: 'title',
    fields: [{ k: 'title', label: 'العنوان', type: 'text', min: 3, max: 120, required: true },
      t('body', 'الوصف', 3, 2000, true), { k: 'eventDate', label: 'التاريخ', type: 'date', required: true }] },
  initiatives: { label: 'المبادرة الشهرية', one: 'مبادرة', publishable: true, titleKey: 'title',
    fields: [{ k: 'title', label: 'عنوان المبادرة', type: 'text', min: 3, max: 120, required: true },
      t('body', 'شرح المبادرة', 3, 2000, true), t('goals', 'الأهداف', 3, 1500, true),
      { k: 'startDate', label: 'تاريخ البداية', type: 'date', required: true }, { k: 'endDate', label: 'تاريخ النهاية', type: 'date', required: true },
      t('howTo', 'تعليمات المشاركة', 3, 1500, true),
      { k: 'status', label: 'الحالة', type: 'select', required: true, options: [['open', 'مفتوحة'], ['closed', 'مغلقة']] },
      t('summary', 'النتائج أو الملخص النهائي (بعد الانتهاء)', 0, 2000, false)] },
  faq: { label: 'الأسئلة الشائعة', one: 'سؤال', publishable: false, titleKey: 'question',
    fields: [{ k: 'question', label: 'السؤال', type: 'text', min: 3, max: 200, required: true }, t('answer', 'الجواب', 3, 2000, true),
      { k: 'order', label: 'الترتيب (0 يظهر أولًا)', type: 'int', min: 0, max: 1000, required: true, def: '0' }] },
  polls: { label: 'التصويت على الأفكار', one: 'تصويت', publishable: true, titleKey: 'title',
    fields: [{ k: 'title', label: 'عنوان الفكرة', type: 'text', min: 3, max: 120, required: true }, t('description', 'وصف مختصر', 3, 1000, true),
      { k: 'startsAt', label: 'بداية التصويت', type: 'datetime', required: true }, { k: 'endsAt', label: 'نهاية التصويت', type: 'datetime', required: true },
      { k: 'showResults', label: 'إظهار النتيجة للطالبات', type: 'select', required: true, options: [['after_end', 'بعد انتهاء التصويت'], ['always', 'دائمًا']] },
      { k: 'closed', label: 'إغلاق التصويت الآن', type: 'bool', required: true }] }
};
export const kindLabel = (k) => (KIND.find((x) => x[0] === k) || [0, k])[1];
export const fdate = (ts) => (ts && ts.toDate) ? ts.toDate().toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
export const fdt = (ts) => (ts && ts.toDate) ? ts.toDate().toLocaleString('ar', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const p2 = (n) => String(n).padStart(2, '0');
export const toInputDate = (ts) => { if (!ts || !ts.toDate) return ''; const d = ts.toDate(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
export const toInputDT = (ts) => { if (!ts || !ts.toDate) return ''; const d = ts.toDate(); return toInputDate(ts) + 'T' + p2(d.getHours()) + ':' + p2(d.getMinutes()); };
