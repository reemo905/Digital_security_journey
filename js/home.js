import { initNav, reveal } from './app.js';
import { SERVICES, TYPES, ICONS } from './services.js';
const p = await initNav();
if (p) document.getElementById('welcome').textContent = 'أهلًا بكِ، ' + p.fullName;
document.getElementById('cta-login').hidden = !!p;
const grid = document.getElementById('services');
const card = (href, icon, title, text) => '<a class="card reveal" href="' + href + '"><span class="ic">' + icon + '</span><h3>' + title + '</h3><p>' + text + '</p><span class="go">فتح ←</span></a>';
grid.innerHTML = TYPES.map((t) => card('service.html?type=' + t, ICONS[t], SERVICES[t].label, SERVICES[t].short)).join('') +
  card('requests.html', ICONS.list, 'طلباتي', 'تابعي حالة كل ما أرسلتِه والردود عليه.');
reveal();
