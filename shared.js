/* shared.js — copy button e utilities */
function cc(btn) {
  const pre = btn.closest('.cb').querySelector('pre');
  navigator.clipboard.writeText(pre.innerText).then(() => {
    btn.textContent = '✓ ok';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'copy'; btn.classList.remove('copied'); }, 2000);
  });
}

/* Evidenzia il nav-btn della pagina corrente */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
    if (path.includes(btn.dataset.page)) btn.classList.add('active');
  });
});
