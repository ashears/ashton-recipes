const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/\p{Mark}/gu, '');
const form = document.querySelector('.search');
const input = form.querySelector('input');
const status = document.querySelector('.search-status');
const recipes = Array.from(document.querySelectorAll('[data-search]'), (element) => ({
  element,
  terms: JSON.parse(element.dataset.search).map(normalize),
}));

function filterRecipes() {
  const query = normalize(input.value).trim();
  const words = query ? query.split(/\s+/u) : [];
  let count = 0;
  for (const { element, terms } of recipes) {
    const matches = words.every((word) => terms.some((term) => term.includes(word)));
    element.hidden = !matches;
    if (matches) count += 1;
  }
  status.textContent = query ? (count ? `${count} ${count === 1 ? 'recipe' : 'recipes'} found.` : 'No matching recipes.') : '';
}

form.addEventListener('submit', (event) => event.preventDefault());
input.addEventListener('input', filterRecipes);
window.addEventListener('pageshow', filterRecipes);
form.hidden = false;
filterRecipes();
