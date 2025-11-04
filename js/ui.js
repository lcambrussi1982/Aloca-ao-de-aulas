// ui.js — menu ativo + alternância de tema (sem tocar no app.js)
(function(){
  const THEME_KEY = 'cambrussi_theme';
  function applyTheme(t){
    document.body.classList.toggle('theme-dark', t==='dark');
    localStorage.setItem(THEME_KEY, t);
  }
  const saved = localStorage.getItem(THEME_KEY);
  if(saved){ applyTheme(saved); }
  const btn = document.getElementById('btn-theme');
  btn && btn.addEventListener('click', ()=> applyTheme(document.body.classList.contains('theme-dark') ? 'light' : 'dark'));

  // Estado ativo no menu
  document.addEventListener('click', (e)=>{
    if(e.target.matches('.nav-btn[data-view]')){
      document.querySelectorAll('.nav-btn').forEach(b=>b.removeAttribute('aria-current'));
      e.target.setAttribute('aria-current','page');
    }
  });
})();