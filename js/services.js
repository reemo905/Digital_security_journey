// تعريف الخدمات: تُبنى منه النماذج وصفحات المتابعة. القيم (الأكواد) يجب أن تطابق قواعد Firestore.
const I = (p) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
export const ICONS = {
  suggestion: I('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
  problem: I('<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h.01"/>'),
  message: I('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
  meeting: I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  event: I('<path d="M12 3l2.7 5.5 6 .9-4.4 4.3 1 6L12 16.8 6.7 19.7l1-6L3.3 9.4l6-.9L12 3z"/>'),
  list: I('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>')
};
const T = (k, label, min, max, req, extra) => Object.assign({ k, label, type: 'textarea', min, max, required: req }, extra || {});

export const SERVICES = {
  suggestion: {
    label: 'تقديم اقتراح', short: 'شاركي فكرة لتحسين المدرسة أو فعالية جديدة.', titleLabel: 'عنوان الاقتراح',
    note: 'سيُحفظ اقتراحك وتتابعين حالته من صفحة «طلباتي». إرسال الاقتراح لا يعني اعتماده.',
    statuses: ['new', 'in_review', 'need_info', 'accepted', 'in_progress', 'done', 'rejected'],
    sl: { in_review: 'قيد الدراسة' },
    fields: [
      { k: 'category', label: 'تصنيف الاقتراح', type: 'select', required: true,
        options: [['event', 'فعالية'], ['contest', 'مسابقة'], ['initiative', 'مبادرة'], ['school', 'تحسين مدرسي'], ['other', 'اقتراح آخر']] },
      T('description', 'وصف الفكرة', 10, 2000, true), T('benefit', 'الفائدة المتوقعة', 3, 1000, true),
      T('extra', 'معلومات إضافية', 0, 1000, false)]
  },
  problem: {
    label: 'الإبلاغ عن مشكلة', short: 'أبلغي عن مشكلة مدرسية بشكل منظّم.', titleLabel: 'عنوان البلاغ',
    note: 'رفع البلاغ لا يعني حل المشكلة تلقائيًا؛ ستُراجعه رئيسة البرلمان وتحيله للجهة المناسبة عند الحاجة. بلاغك لا يراه إلا أنتِ والمديرة.',
    safety: { field: 'category', value: 'safety',
      text: 'إذا كنتِ أو زميلة لكِ في خطر الآن، أو تتعرضين لتنمّر أو تهديد، فتحدثي فورًا مع معلمة موثوقة أو المرشدة أو إدارة المدرسة، ولا تنتظري الرد من البوابة. هذه البوابة ليست خدمة طوارئ.' },
    statuses: ['new', 'in_review', 'need_info', 'referred', 'resolved', 'closed'],
    fields: [
      { k: 'category', label: 'نوع المشكلة', type: 'select', required: true,
        options: [['facilities', 'مرافق ومبانٍ'], ['cleanliness', 'نظافة'], ['safety', 'تنمّر أو تهديد أو خطر على السلامة'], ['academic', 'دراسية'], ['technology', 'تقنية'], ['other', 'أخرى']] },
      T('description', 'وصف ما حدث', 10, 2000, true),
      { k: 'place', label: 'المكان المرتبط بالمشكلة', type: 'text', max: 150, required: false },
      { k: 'whenText', label: 'التاريخ أو الوقت التقريبي', type: 'text', max: 100, required: false, hint: 'مثال: أمس بعد الفسحة' },
      { k: 'urgency', label: 'درجة الاستعجال', type: 'select', required: true,
        options: [['low', 'عادية'], ['medium', 'متوسطة'], ['high', 'مستعجلة']] }]
  },
  message: {
    label: 'مراسلة رئيسة البرلمان', short: 'رسالة رسمية بعنوان وتصنيف.', titleLabel: 'عنوان الرسالة',
    note: 'هذه رسالة منظّمة وليست محادثة مفتوحة، ولا يراها غير المديرة. لا تكتبي أرقام هواتف أو حسابات شخصية.',
    statuses: ['new', 'in_review', 'answered', 'closed'],
    fields: [
      { k: 'category', label: 'تصنيف الرسالة', type: 'select', required: true,
        options: [['parliament', 'استفسار متعلق بالبرلمان'], ['suggestion_followup', 'متابعة اقتراح'], ['problem_followup', 'متابعة مشكلة'], ['event', 'استفسار عن فعالية'], ['cooperation', 'طلب تعاون'], ['other', 'موضوع آخر متعلق بالمدرسة والبرلمان']] },
      T('body', 'نص الرسالة', 10, 3000, true)]
  },
  meeting: {
    label: 'طلب اجتماع', short: 'اطلبي موعدًا لعرض موضوع معيّن.', titleLabel: 'عنوان الاجتماع',
    note: 'تقديم الطلب لا يعني تأكيد الاجتماع. المواعيد النهائية تخضع لموافقة المدرسة وتنظيمها.',
    statuses: ['new', 'in_review', 'coordinating', 'accepted', 'rejected', 'completed'],
    sl: { rejected: 'مرفوض' },
    fields: [
      T('topic', 'موضوع الاجتماع', 3, 200, true), T('reason', 'سبب الطلب', 5, 1500, true),
      { k: 'audience', label: 'الفئة المعنية', type: 'text', max: 100, required: false, hint: 'مثال: طالبات الصف العاشر' },
      { k: 'proposedTime', label: 'الموعد المقترح', type: 'text', max: 100, required: false, hint: 'مثال: الأحد بعد الفسحة' },
      T('extra', 'ملاحظات إضافية', 0, 1000, false)]
  },
  event: {
    label: 'اقتراح فعالية', short: 'قدّمي فكرة لفعالية أو مبادرة مدرسية.', titleLabel: 'اسم الفعالية',
    note: 'تراجع المديرة فكرتك وتحدّث حالتها. لا تُنشر الفعالية للجميع إلا بعد اعتمادها.',
    statuses: ['new', 'in_review', 'accepted', 'in_progress', 'done', 'rejected'],
    sl: { in_review: 'قيد الدراسة', accepted: 'معتمدة', rejected: 'غير معتمدة', done: 'نُفّذت' },
    fields: [
      { k: 'eventType', label: 'نوع الفعالية', type: 'select', required: true,
        options: [['cultural', 'ثقافية'], ['sports', 'رياضية'], ['social', 'اجتماعية'], ['awareness', 'توعوية'], ['academic', 'علمية / أكاديمية'], ['other', 'أخرى']] },
      T('idea', 'فكرة الفعالية', 10, 2000, true), T('goals', 'أهداف الفعالية', 5, 1000, true),
      { k: 'audience', label: 'الفئة المستفيدة', type: 'text', min: 2, max: 100, required: true },
      T('requirements', 'المتطلبات أو المواد اللازمة', 0, 1000, false),
      { k: 'proposedTime', label: 'الموعد المقترح', type: 'text', max: 100, required: false }]
  }
};
export const TYPES = Object.keys(SERVICES);
const SL = { new: 'جديد', in_review: 'قيد المراجعة', need_info: 'يحتاج إلى معلومات إضافية', accepted: 'مقبول', in_progress: 'قيد التنفيذ',
  done: 'نُفّذ', rejected: 'غير معتمد', referred: 'أُحيل إلى الجهة المختصة', resolved: 'تمت المعالجة', closed: 'أُغلق',
  answered: 'تم الرد', coordinating: 'يحتاج إلى تنسيق', completed: 'مكتمل' };
export const statusLabel = (type, s) => ((SERVICES[type] && SERVICES[type].sl && SERVICES[type].sl[s]) || SL[s] || s);
export const refCode = (id) => id.slice(0, 6).toUpperCase();
export const fmtDate = (t) => (t && t.toDate) ? t.toDate().toLocaleDateString('ar', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

// عرض تفاصيل الطلب (للطالبة وللمديرة). الملاحظات الداخلية لا تُعرض هنا أبدًا.
export function detailsHtml(r, esc) {
  const S = SERVICES[r.type]; if (!S) return '';
  const rows = [];
  for (const f of S.fields) {
    let v = (r.details || {})[f.k]; if (!v) continue;
    if (f.type === 'select') { const o = f.options.find((x) => x[0] === v); v = o ? o[1] : v; }
    rows.push('<dt>' + esc(f.label) + '</dt><dd>' + esc(v) + '</dd>');
  }
  return '<dl class="dl">' + rows.join('') + '</dl>';
}
