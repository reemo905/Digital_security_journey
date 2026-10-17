const COLORS = [['teal', 'أخضر مزرق'], ['blue', 'أزرق'], ['purple', 'بنفسجي'], ['rose', 'وردي داكن'], ['slate', 'رمادي']];
const MODES = [['auto', 'حسب الجهاز'], ['light', 'فاتح'], ['dark', 'داكن']];
const SIZES = [['normal', 'عادي'], ['large', 'كبير'], ['xl', 'كبير جدًا']];
const load = () => { try { return JSON.parse(localStorage.getItem('pp_prefs') || '{}'); } catch (e) { return {}; } };
const save = (p) => { try { localStorage.setItem('pp_prefs', JSON.stringify(p)); } catch (e) {} };
function apply(p) {
  const h = document.documentElement, set = (k, v) => { if (v) h.setAttribute(k, v); else h.removeAttribute(k); };
  set('data-color', p.color && p.color !== 'teal' ? p.color : '');
  const dark = (p.mode || 'auto') === 'dark' || ((p.mode || 'auto') === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  set('data-mode', dark ? 'dark' : '');
  set('data-size', p.size && p.size !== 'normal' ? p.size : '');
  set('data-motion', p.motion === 'reduced' ? 'reduced' : '');
}
const group = (name, title, list, cur, dots) => '<fieldset class="opt-group"><legend>' + title + '</legend><div class="choices">' +
  list.map((o) => '<label class="choice"><input type="radio" name="' + name + '" value="' + o[0] + '"' + (o[0] === cur ? ' checked' : '') + '><span class="lbl">' +
    (dots ? '<span class="sw-dot sw-' + o[0] + '"></span>' : '') + o[1] + '</span></label>').join('') + '</div></fieldset>';
export function mountAppearance(el) {
  const p = load();
  el.innerHTML = group('color', 'لون الموقع', COLORS, p.color || 'teal', true) + group('mode', 'المظهر', MODES, p.mode || 'auto') + group('size', 'حجم الخط', SIZES, p.size || 'normal') +
    '<label class="check"><input type="checkbox" id="ap-motion"' + (p.motion === 'reduced' ? ' checked' : '') + '> تقليل الحركة والمؤثرات</label>' +
    '<p class="note">تُحفظ هذه الاختيارات على هذا الجهاز فقط.</p><button class="btn btn-small btn-ghost" id="ap-reset" type="button">إعادة الضبط</button>';
  const read = () => ({ color: (el.querySelector('input[name=color]:checked') || {}).value, mode: (el.querySelector('input[name=mode]:checked') || {}).value,
    size: (el.querySelector('input[name=size]:checked') || {}).value, motion: el.querySelector('#ap-motion').checked ? 'reduced' : 'normal' });
  el.addEventListener('change', () => { const v = read(); save(v); apply(v); });
  el.querySelector('#ap-reset').onclick = () => { try { localStorage.removeItem('pp_prefs'); } catch (e) {} apply({}); mountAppearance(el); };
}
