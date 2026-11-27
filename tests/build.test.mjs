import { deepEqual, equal, match, doesNotMatch, rejects } from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { build } from '../scripts/build.mjs';

const beans = {
  title: 'Lemon & Herb Beans',
  yield: 'Serves 2',
  ingredients: ['1 can white beans', '1 tablespoon lemon juice'],
  steps: ['Warm the white beans.', 'Stir in 1 tablespoon lemon juice.'],
  totalMinutes: 10,
  tags: ['pantry', 'quick dinner'],
  notes: ['Serve with bread.'],
  sourceUrl: 'https://example.com/beans?a=1&b=2',
};

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'recipes-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const recipesDir = join(root, 'recipes');
  const outDir = join(root, '_site');
  await mkdir(recipesDir);
  await writeFile(join(recipesDir, '.gitkeep'), '');
  return { recipesDir, outDir };
}

test('an empty collection builds a publishable index with no detail pages', async (t) => {
  const paths = await fixture(t);
  equal(await build(paths), 0);
  match(await readFile(join(paths.outDir, 'index.html'), 'utf8'), /No recipes yet\./);
  deepEqual((await readdir(paths.outDir)).sort(), ['assets', 'index.html']);
});

test('adding recipes generates sorted links, search data and complete detail pages', async (t) => {
  const paths = await fixture(t);
  await writeFile(join(paths.recipesDir, 'lemon-beans.json'), JSON.stringify(beans));
  await writeFile(join(paths.recipesDir, 'toast.json'), JSON.stringify({ ...beans, title: 'Avocado <Toast>', yield: undefined, totalMinutes: undefined }));
  equal(await build(paths), 2);

  const index = await readFile(join(paths.outDir, 'index.html'), 'utf8');
  match(index, /href="recipe\/toast\/">Avocado &lt;Toast&gt;<\/a>[\s\S]+href="recipe\/lemon-beans\/">Lemon &amp; Herb Beans<\/a>/);
  match(index, /data-search="[^"]*white beans[^"]*quick dinner/);

  const page = await readFile(join(paths.outDir, 'recipe', 'lemon-beans', 'index.html'), 'utf8');
  match(page, /href="\.\.\/\.\.\/assets\/site\.css"/);
  match(page, /Serves 2[\s\S]+10 min total[\s\S]+href="#steps"[\s\S]+id="ingredients"[\s\S]+<ul class="ingredients">\s+<li>1 can white beans<\/li>\s+<li>1 tablespoon lemon juice<\/li>\s+<\/ul>[\s\S]+id="steps"[\s\S]+<ol class="steps">[\s\S]+Stir in 1 tablespoon lemon juice\.[\s\S]+Cooking notes[\s\S]+href="https:\/\/example\.com\/beans\?a=1&amp;b=2">Original recipe/);

  doesNotMatch(page, /type="checkbox"|checklist\.js|reset-ingredients/);

  const toastPage = await readFile(join(paths.outDir, 'recipe', 'toast', 'index.html'), 'utf8');
  doesNotMatch(toastPage, /recipe-meta|undefined/);

  await rm(join(paths.recipesDir, 'toast.json'));
  equal(await build(paths), 1);
  deepEqual(await readdir(join(paths.outDir, 'recipe')), ['lemon-beans']);
});

test('a recipe without steps builds as a list-only detail page', async (t) => {
  const paths = await fixture(t);
  const teaBlends = {
    title: 'Tea Blends',
    ingredients: ['Hojicha & Lavender', 'Chamomile & Mint', 'Hibiscus & Cinnamon'],
    tags: ['tea'],
  };
  await writeFile(join(paths.recipesDir, 'tea-blends.json'), JSON.stringify(teaBlends));

  equal(await build(paths), 1);
  const index = await readFile(join(paths.outDir, 'index.html'), 'utf8');
  match(index, /href="recipe\/tea-blends\/">Tea Blends<\/a>/);

  const page = await readFile(join(paths.outDir, 'recipe', 'tea-blends', 'index.html'), 'utf8');
  match(page, /<h2 id="ingredients">Ingredients<\/h2>[\s\S]+Hojicha &amp; Lavender[\s\S]+Chamomile &amp; Mint[\s\S]+Hibiscus &amp; Cinnamon/);
  doesNotMatch(page, /href="#steps"|id="steps"|>Steps</);
});

test('the build rejects malformed JSON, empty steps, and unsafe source URLs', async (t) => {
  const paths = await fixture(t);
  const filename = join(paths.recipesDir, 'broken.json');
  await writeFile(filename, '{');
  await rejects(build(paths), /broken\.json:/);
  await writeFile(filename, JSON.stringify({ ...beans, steps: [] }));
  await rejects(build(paths), /broken\.json: steps must be a nonempty array/);
  await writeFile(filename, JSON.stringify({ ...beans, sourceUrl: 'javascript:alert(1)' }));
  await rejects(build(paths), /broken\.json: sourceUrl must be an absolute HTTP or HTTPS URL/);
});
