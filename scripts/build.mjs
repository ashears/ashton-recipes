import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const fields = new Set([
  'title', 'yield', 'ingredients', 'steps', 'totalMinutes', 'tags', 'notes', 'sourceUrl',
]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

function requireText(value, field) {
  if (typeof value !== 'string' || !value.trim() || /[\r\n]/u.test(value)) {
    throw new Error(`${field} must be a nonempty, single-line string`);
  }
  return value.trim();
}

function requireList(value, field) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${field} must be a nonempty array`);
  }
  return value.map((item, index) => requireText(item, `${field}[${index + 1}]`));
}

function validate(recipe) {
  if (!recipe || typeof recipe !== 'object' || Array.isArray(recipe)) {
    throw new Error('Expected a recipe object');
  }
  for (const field of Object.keys(recipe)) {
    if (!fields.has(field)) throw new Error(`Unknown field "${field}"`);
  }

  const { totalMinutes } = recipe;
  if (totalMinutes !== undefined && (!Number.isSafeInteger(totalMinutes) || totalMinutes < 1)) {
    throw new Error('totalMinutes must be a positive integer');
  }

  let sourceUrl;
  if (recipe.sourceUrl !== undefined) {
    const value = requireText(recipe.sourceUrl, 'sourceUrl');
    try {
      const url = new URL(value);
      if (/^https?:\/\//iu.test(value) && !url.username && !url.password) sourceUrl = url.href;
    } catch {
      // Report an actionable field error below.
    }
    if (!sourceUrl) throw new Error('sourceUrl must be an absolute HTTP or HTTPS URL');
  }

  return {
    title: requireText(recipe.title, 'title'),
    yield: recipe.yield === undefined ? undefined : requireText(recipe.yield, 'yield'),
    ingredients: requireList(recipe.ingredients, 'ingredients'),
    steps: requireList(recipe.steps, 'steps'),
    totalMinutes,
    tags: recipe.tags === undefined ? [] : requireList(recipe.tags, 'tags'),
    notes: recipe.notes === undefined ? [] : requireList(recipe.notes, 'notes'),
    sourceUrl,
  };
}

async function loadRecipes(recipesDir) {
  const entries = await readdir(recipesDir, { withFileTypes: true });
  const recipes = [];
  for (const entry of entries) {
    if (entry.name === '.gitkeep') continue;
    try {
      if (!entry.isFile() || extname(entry.name) !== '.json') {
        throw new Error('Expected a recipe JSON file');
      }
      const slug = entry.name.slice(0, -5);
      if (!slugPattern.test(slug)) throw new Error('Use a lowercase, hyphen-separated filename');
      const data = JSON.parse(await readFile(join(recipesDir, entry.name), 'utf8'));
      recipes.push({ slug, ...validate(data) });
    } catch (error) {
      throw new Error(`${entry.name}: ${error.message}`, { cause: error });
    }
  }
  return recipes.sort((a, b) => collator.compare(a.title, b.title) || a.slug.localeCompare(b.slug, 'en'));
}

const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/gu, (character) => htmlEntities[character]);

function page({ title, relativeRoot, homeHref, homeLabel, script, content }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f8f7f2">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="${relativeRoot}assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${relativeRoot}assets/site.css">
  ${script ? `<script src="${relativeRoot}assets/${script}" type="module"></script>` : ''}
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="shell">
    <header class="masthead">
      <a class="wordmark" href="${relativeRoot}"><span class="mark" aria-hidden="true"></span>Recipes</a>
      ${homeHref ? `<a class="masthead-link" href="${homeHref}">${homeLabel}</a>` : ''}
    </header>
    <main id="main" tabindex="-1">
${content}
    </main>
  </div>
</body>
</html>
`;
}

function indexPage(recipes) {
  const empty = '<p class="empty-state">No recipes yet.</p>';
  const items = recipes.map((recipe) => {
    const searchIndex = JSON.stringify([recipe.title, ...recipe.ingredients, ...recipe.tags]);
    return `          <li data-search="${escapeHtml(searchIndex)}">
            <a href="recipe/${recipe.slug}/">${escapeHtml(recipe.title)}</a>
          </li>`;
  }).join('\n');

  return page({
    title: 'Recipes | Ashton Shears',
    relativeRoot: './',
    homeHref: 'https://ashton.website/',
    homeLabel: 'Ashton Shears',
    script: recipes.length ? 'search.js' : undefined,
    content: `      <h1>Recipes</h1>
${recipes.length ? `      <form class="search" role="search" hidden>
        <label for="recipe-search">Search recipes</label>
        <input id="recipe-search" type="search" placeholder="Title, ingredient, or tag">
      </form>
      <p class="search-status" role="status"></p>
      <ul class="recipe-index" role="list">
${items}
      </ul>` : `      ${empty}`}`,
  });
}

function recipePage(recipe) {
  const ingredients = recipe.ingredients.map((line) => `          <li>${escapeHtml(line)}</li>`).join('\n');
  const steps = recipe.steps.map((step) => `          <li>${escapeHtml(step)}</li>`).join('\n');
  const notes = recipe.notes.map((note) => `        <p>${escapeHtml(note)}</p>`).join('\n');
  const yieldText = recipe.yield ? `<span>${escapeHtml(recipe.yield)}</span>` : '';
  const totalTime = recipe.totalMinutes ? `<span>${recipe.totalMinutes} min total</span>` : '';

  return page({
    title: `${recipe.title} | Recipes`,
    relativeRoot: '../../',
    content: `      <h1>${escapeHtml(recipe.title)}</h1>
${yieldText || totalTime ? `      <p class="recipe-meta">${yieldText}${totalTime}</p>\n` : ''}      <a class="jump" href="#steps">Jump to steps</a>
      <section aria-labelledby="ingredients">
        <h2 id="ingredients">Ingredients</h2>
        <ul class="ingredients">
${ingredients}
        </ul>
      </section>
      <section aria-labelledby="steps">
        <h2 id="steps" tabindex="-1">Steps</h2>
        <ol class="steps">
${steps}
        </ol>
      </section>
${notes ? `      <section aria-labelledby="notes">
        <h2 id="notes">Cooking notes</h2>
${notes}
      </section>` : ''}
${recipe.sourceUrl ? `      <p class="source"><a href="${escapeHtml(recipe.sourceUrl)}">Original recipe</a></p>` : ''}`,
  });
}

async function writePage(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

export async function build({
  recipesDir = join(root, 'recipes'),
  outDir = join(root, '_site'),
} = {}) {
  const recipes = await loadRecipes(recipesDir);
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await cp(join(root, 'assets'), join(outDir, 'assets'), { recursive: true });
  await writePage(join(outDir, 'index.html'), indexPage(recipes));
  for (const recipe of recipes) {
    await writePage(join(outDir, 'recipe', recipe.slug, 'index.html'), recipePage(recipe));
  }
  return recipes.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const count = await build();
    console.log(`Built ${count} ${count === 1 ? 'recipe' : 'recipes'} in _site/.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
