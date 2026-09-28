# Package or Not?

A browser game: pick a package ecosystem, then guess whether each of 10 package names is real or made up.

Names come from CRAN, Bioconductor, PyPI and OpenVSX (via [p3m.dev](https://p3m.dev)), plus npm, crates.io and RubyGems. There is also a Mixed bag option.

Fake names are generated in your browser from a Markov model trained on real names, and checked so that they do not exist in the registry.

## Play

```
npm run serve
```

Open http://localhost:8000.

Needs Node 24 or newer.

Keys: 1 to 8 pick an ecosystem. R or Left arrow for Real, F or Right arrow for Fake, N for the next name. On the results screen: P to play again, C to copy a link to your results, E to pick another ecosystem.

The results link opens the same results for anyone you send it to.

## Test

```
npm test
npm run lint:css
```

`lint:css` installs ESLint into `~/.cache/pkg-or-not-lint` on first run, not into the repo.

## Refresh the package data

```
node prep/build.js              # all ecosystems
node prep/build.js cran npm     # only some
node prep/preview.js pypi       # print sample fakes and reals
```

A full build crawls several registries and takes over an hour (crates.io is the slowest). Set `PKG_OR_NOT_CONTACT` to add contact info to the User-Agent.

## Deploy

The site runs at https://packageornot.com on Cloudflare Workers static assets. `wrangler.jsonc` points Cloudflare at `site/`. Every push to `main` deploys through Workers Builds, which runs `npx wrangler deploy` on Cloudflare's side. Nothing is installed in the repo.
