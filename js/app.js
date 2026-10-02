const onglets = document.querySelectorAll('.onglets__onglet');
const vues = document.querySelectorAll('.vue');

function afficherVue(idVue) {
  vues.forEach((vue) => vue.classList.toggle('vue--active', vue.id === idVue));

  onglets.forEach((onglet) => {
    const actif = onglet.getAttribute('href') === `#${idVue}`;
    onglet.classList.toggle('onglets__onglet--actif', actif);
    if (actif) {
      onglet.setAttribute('aria-current', 'page');
    } else {
      onglet.removeAttribute('aria-current');
    }
  });

  window.scrollTo(0, 0);
}

onglets.forEach((onglet) => {
  onglet.addEventListener('click', (evenement) => {
    evenement.preventDefault();
    afficherVue(onglet.getAttribute('href').slice(1));
  });
});
