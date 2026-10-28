const burger = document.querySelector('.burger');
const nav = document.getElementById('nav');

function setMenu(open) {
  nav.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
}

burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', e => { if (e.target.tagName === 'A') setMenu(false); });

document.getElementById('ano').textContent = new Date().getFullYear();
