# Recipes

A personal cookbook by Ashton Shears. The ingredient checklist comes first, with a jump link to the directions. The public collection starts empty.

## Draft a recipe with Codex

Open this repository in Codex and paste a prompt like this:

> Draft a recipe from [URL, notes, or idea]. Adapt it to [my preferred units, flavors, or substitutions]. Follow AGENTS.md, keep the directions short and scannable, and repeat amounts where I need them in a step. Link the original source if I provided one. Run the tests and build, then show me the draft and flag any details I need to confirm.

Review the JSON before merging. Recipes in the repository and on the website are public.

## Recipe format

Add a file such as `recipes/lemon-herb-beans.json`. The filename sets the URL, so use lowercase letters, numbers, and hyphens and keep the filename when revising the recipe. This example lives here in the README.

```json
{
  "title": "Lemon Herb Beans",
  "yield": "Serves 2",
  "ingredients": [
    "1 tablespoon olive oil",
    "1 (15-ounce) can white beans, drained and rinsed",
    "1 tablespoon lemon juice",
    "2 tablespoons chopped parsley"
  ],
  "steps": [
    "Warm 1 tablespoon olive oil in a skillet over medium heat. Add the beans and cook for about 4 minutes, stirring, until hot.",
    "Take the pan off the heat. Stir in 1 tablespoon lemon juice and 2 tablespoons chopped parsley."
  ],
  "totalMinutes": 10,
  "tags": ["beans", "quick dinner"],
  "notes": ["Serve with grilled bread."]
}
```

Require `title`, `yield`, `ingredients`, and `steps`. Ingredients and steps are nonempty arrays of plain-text lines. Optional fields are `totalMinutes` (a positive whole number), `tags` and `notes` (nonempty arrays of plain-text lines when present), and `sourceUrl` (an absolute HTTP or HTTPS URL). The build prints the filename and reason if a recipe fails validation.

## Preview and publish

Use Node.js 22 or newer. There are no packages to install.

```sh
npm test
npm run build
npm start
```

The preview opens at `http://127.0.0.1:47131/recipes/`. Set `PORT` to use a different port. The build generates the index, search data, and one static page per recipe in `_site/`. For example, `lemon-herb-beans.json` becomes `recipe/lemon-herb-beans/` under the deployed project URL. Checkmarks are saved in the current browser for each recipe.

GitHub Actions checks pull requests and builds and deploys `_site/` from `main`. In the repository's Pages settings, select **GitHub Actions** as the source. The project inherits its domain from the account's main Pages site.
