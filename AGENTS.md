# Recipe contributions

- To add or adapt a recipe, create or update one JSON file in `recipes/`. Follow the recipe example in the README. Preserve the filename when revising an existing recipe so its public URL keeps working.
- Use the quantities and units the cook provides. Add suggested amounts only when asked. Write short, ordered directions with an action first. Repeat ingredient amounts where doing so saves a trip back to the list. Include time and doneness cues when they are known and useful.
- Use the cook's preferred units, flavors, and substitutions when provided. When adapting a recipe from a link, write the directions in your own words and include the original URL as `sourceUrl`.
- Flag unresolved details in your response for review. Check that every needed ingredient is listed, that quantities agree with the steps, and that yields and times match the source or the cook's notes. Omit optional details you cannot verify. If a missing required detail prevents a usable draft, ask about it.
- Run `npm test` and `npm run build`. Show the user the draft and any assumptions. Use a pull request when requested, and let the owner review and merge.
