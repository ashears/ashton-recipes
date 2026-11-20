const checklist = document.querySelector('.ingredients');
const ingredients = [...checklist.querySelectorAll('input')];
const reset = document.querySelector('#reset-ingredients');
const key = `ashton-recipes:checklist:v1:${location.pathname}`;
const signature = JSON.stringify(ingredients.map((input) => input.nextElementSibling.textContent));

function restoreChecks() {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved?.signature === signature && Array.isArray(saved.checked)) {
      ingredients.forEach((input, index) => { input.checked = saved.checked[index] === true; });
    }
  } catch {
    // Native checkboxes still work when storage is unavailable.
  }
}

function saveChecks() {
  try {
    const checked = ingredients.map((input) => input.checked);
    if (checked.some(Boolean)) localStorage.setItem(key, JSON.stringify({ signature, checked }));
    else localStorage.removeItem(key);
  } catch {
    // Keep the current page interactive if saving fails.
  }
}

restoreChecks();
checklist.addEventListener('change', saveChecks);
reset.addEventListener('click', () => {
  for (const input of ingredients) input.checked = false;
  saveChecks();
});
reset.hidden = false;
