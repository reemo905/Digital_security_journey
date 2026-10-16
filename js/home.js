import { initNav } from './app.js';
const p = await initNav();
if (p) document.getElementById('welcome').textContent = 'أهلًا بكِ، ' + p.fullName;
document.getElementById('cta-login').hidden = !!p;
