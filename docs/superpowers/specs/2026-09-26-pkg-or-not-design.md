# Package or Not? Design

Date: 2026-09-26
Status: Approved in brainstorming, pending spec review

## Summary

A browser game. The player picks a package ecosystem, then sees 10 package names one at a time and guesses whether each one is Real or Fake. At the end the game shows a score out of 10 and a funny saying chosen by ecosystem and score band.

Fake names are generated in the browser by a character-level Markov model trained on each ecosystem's real names. The browser rejects any generated name that actually exists, using data shipped with the site (or a live registry check for npm).

## Constraints

- No backend. The site is static files and browser-only JavaScript.
- CRAN, Bioconductor and PyPI names come from p3m.dev.
- p3m.dev sends no CORS headers (checked on `__api__`, `PACKAGES` files and the PyPI simple index), so the browser cannot read it. A Node prep script, run locally by the developer, fetches all data ahead of time and writes static files into the site.
- Plain HTML, CSS and ES modules. No build step, no framework.

## Ecosystems

Six ecosystems plus a "Mixed bag" option:

| Ecosystem | Name source | Existence check in browser |
|---|---|---|
| CRAN | p3m `/__api__/repos/cran/packages` (about 33.8k, paged, 1000 per page) | Exact name list |
| Bioconductor | p3m `/__api__/repos/bioconductor/packages?bioc_version=3.23` (about 3.8k) | Exact name list |
| PyPI | p3m `/__api__/repos/pypi/packages` (about 882k, paged) | Bloom filter |
| crates.io | crates.io API `/api/v1/crates` paged, or the db dump | Bloom filter |
| RubyGems | `https://rubygems.org/names` (single text file) | Bloom filter |
| npm | `all-the-package-names` npm package (about 3 to 4 million names) | Live `GET https://registry.npmjs.org/<name>` (404 means free; the registry allows CORS) |

The Bioconductor version is a prep config value (default `3.23`).

Mixed bag loads each ecosystem's data when a round first needs it and picks the ecosystem for each round at random.

## Architecture

Two parts that share only the files in `site/data/` and a few shared modules.

```
pkg-or-not/
  prep/
    sources/            one module per ecosystem: fetchPackages(), describe(pkgs)
    markov.js           train(names, order) -> model JSON
    build.js            runs every source, writes site/data/<eco>/*
  site/
    index.html
    style.css
    js/
      shared/
        bloom.js        Bloom filter build and lookup (used by prep and site)
        normalize.js    per-registry name normalization (used by prep and site)
        markov-sample.js  sampling from a trained model (used by prep and site)
      game.js           game rules and state
      generator.js      fake name generation with filtering
      checker.js        existence check per ecosystem
      sayings.js        end-of-game sayings
      ui.js             screens and DOM
    data/<eco>/
      model.json        Markov model
      reals.json        about 1000 sampled real names with description and registry URL
      names.json        exact name list (CRAN, Bioconductor)
      bloom.bin         Bloom filter (PyPI, crates.io, RubyGems)
      fakes-verified.json  about 200 fakes already checked at build time (npm only, offline fallback)
  test/
  docs/superpowers/specs/
```

The shared modules are plain ES modules with no Node or DOM dependencies, so the prep script and the browser use the same code for filter layout, normalization and sampling.

## Prep script

`node prep/build.js [eco...]` runs all ecosystems, or only the ones named.

For each ecosystem it:

1. Fetches the complete name list.
2. Normalizes names with that registry's rules.
3. Trains a Markov model. Default order is 3; order is a per-ecosystem config value so it can be tuned.
4. Builds the existence data (exact list, Bloom filter, or nothing for npm).
5. Samples about 1000 real names and fetches a one-line description and registry URL for each.
6. For npm only, generates about 200 fakes, checks each against the registry, and writes the survivors to `fakes-verified.json`.
7. Writes files to `site/data/<eco>/`.

Normalization rules:

- PyPI: lowercase, and runs of `-`, `_`, `.` become `-` (PEP 503).
- crates.io: lowercase, `_` becomes `-`.
- npm: lowercase. Scoped names (`@scope/name`) are kept whole.
- CRAN and Bioconductor: names are compared case-insensitively (normalize lowercases them), so a fake that differs from a real name only by case (for example `ggPlot2`) is rejected.
- RubyGems: lowercase for comparison.

Bloom filters target a 5 percent false positive rate. A false positive only makes the generator throw away a good fake. A Bloom filter has no false negatives, so a real name is never shown as fake.

Politeness: requests are sequential per host with a short delay between p3m pages. On HTTP 429 or 5xx, the script retries with backoff. A User-Agent identifying the project is sent to every registry.

If a source fails, the script logs the error, leaves that ecosystem's existing files untouched, and continues with the others. It exits non-zero if any ecosystem failed.

Sampled real names come from the whole list, not only popular packages, so obscure real names like `catseyes` appear.

## Fake generation in the browser

`generator.js` samples from the model and accepts a candidate only if all of these hold:

- Length is between the 10th and 90th percentile of real name lengths for that ecosystem (stored in `model.json`).
- It does not exist according to `checker.js`.
- It is not on a small offensive-word blocklist.

After 50 rejected candidates in a row, the round uses a real name instead.

For npm, the fake is chosen and checked against the live registry before the round is shown, so the reveal has no delay. npm makes at most 10 live checks per fake before falling back to `fakes-verified.json`. Scoped npm candidates (`@scope/name`) use scoped names from `fakes-verified.json` instead of a live check, because their registry 404s have no CORS header. If the live check fails (network error or timeout of 3 seconds), the round uses a name from `fakes-verified.json`.

## Game flow and UI

One page with three screens, shown and hidden with no routing.

1. Pick screen. Seven cards: CRAN, Bioconductor, PyPI, npm, crates.io, RubyGems, Mixed bag. Each has a one-line teaser. Choosing a card loads that ecosystem's data behind a short spinner.
2. Play screen. Shows one name, the ecosystem badge, the round counter (for example 4/10), and Real and Fake buttons. R or the left arrow answers Real; F or the right arrow answers Fake.
   - Each round is real or fake with equal chance, limited so every game has between 3 and 7 fakes.
   - After a guess, the answer is shown. A real name shows its description and a link to its registry page. A fake shows "Nobody has claimed this name... yet." A Next button goes on; after the reveal, N or Enter (the focused Next button) goes on.
3. Results screen. Score out of 10, a list of all 10 names with the answer, the player's guess and registry links for real names, a saying, and two buttons: "Play again" (same ecosystem) and "Pick another ecosystem".

The layout works on phones, down to 360 px wide.

## Sayings

`sayings.js` holds hand-written sayings for 7 ecosystems (including Mixed bag) and 4 score bands: 0 to 3, 4 to 6, 7 to 9, and 10. Each cell has 2 or 3 sayings, and one is picked at random. Examples:

| Band | CRAN | npm |
|---|---|---|
| 0 to 3 | "You've clearly never had to run `install.packages()` on a Friday afternoon." | "Relax, there's probably a package for that. Maybe even one of the fake ones." |
| 4 to 6 | "Respectable. You've seen a few DESCRIPTION files." | "Half right, which is more than most dependency trees." |
| 7 to 9 | "You dream in tidyverse function names." | "Your node_modules folder is bigger than your house." |
| 10 | "Are you secretly a CRAN maintainer? Blink twice." | "You have typed `npm install` more times than you have blinked." |

## Error handling in the site

- If an ecosystem's data fails to load, the player sees a short message and returns to the pick screen.
- In Mixed bag, if one ecosystem fails to load, that ecosystem is left out for the rest of the game.

## Testing

Tests use Node's built-in `node:test` and run with `node --test`. Tests never use the network.

- `bloom.js`: no false negatives across a large inserted set; measured false positive rate is close to the target; the same bytes load the same way in both uses.
- `normalize.js`: the rules above for each registry.
- `markov.js` and `markov-sample.js`: sampled names use only characters seen in training and respect the length limits.
- `generator.js`: never returns a name the checker says exists; falls back to a real name after 50 rejections.
- `game.js`: 10 rounds, 3 to 7 fakes, correct scoring, correct band choice.
- Prep smoke test: `build.js` runs with sources stubbed, using small inline fixtures in `test/build.test.js`, and writes the expected files.
- Manual check in Chrome at desktop and phone widths before calling the work done.

## Out of scope

- Daily puzzle and share cards.
- Stats or history across games.
- Hosting and deployment setup.

## Change log

2026-09-26: Maven removed by user decision; the Maven Central search API could not be crawled reliably. Six ecosystems remain.
2026-09-26: Real-name links for CRAN, Bioconductor and PyPI go to the package's p3m.dev page.
2026-09-26: Spec text updated to match the code after the final review.
