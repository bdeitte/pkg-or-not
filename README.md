# Package or Not?

A browser game: pick a package ecosystem, then guess whether each of 10 package names is real or made up.

Names come from CRAN, Bioconductor, PyPI and OpenVSX (via [p3m.dev](https://p3m.dev)), plus npm, crates.io and RubyGems.

## Play

```
npm run serve
```

Open http://localhost:8000.

Needs python3 for the local server.

## Test

```
npm test
```

## Refresh the package data

```
node prep/build.js
```

This crawls several registries and takes over an hour (crates.io is the slowest).
