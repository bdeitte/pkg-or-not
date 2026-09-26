// Ecosystem metadata shared by the prep script and the browser.

export const ECOSYSTEM_IDS = ['cran', 'bioc', 'pypi', 'openvsx', 'npm', 'crates', 'rubygems'];

// urlPrefix: every real package link starts with it. Shared result links are checked against it.
export const ECOSYSTEMS = {
  cran: { label: 'CRAN', check: 'names', teaser: 'R packages, with capital letters in surprising places.', linkLabel: 'p3m.dev', urlPrefix: 'https://p3m.dev/client/#/repos/cran/packages/' },
  bioc: { label: 'Bioconductor', check: 'names', teaser: 'Genomics tools with names only a biologist could love.', linkLabel: 'p3m.dev', urlPrefix: 'https://p3m.dev/client/#/repos/bioconductor/packages/' },
  pypi: { label: 'PyPI', check: 'bloom', teaser: 'Nearly a million Python packages. Somebody took every name.', linkLabel: 'p3m.dev', urlPrefix: 'https://p3m.dev/client/#/repos/pypi/packages/' },
  openvsx: { label: 'OpenVSX', check: 'bloom', teaser: 'Editor extensions for VS Code and friends, named by marketing.', linkLabel: 'p3m.dev', urlPrefix: 'https://p3m.dev/client/#/repos/openvsx/packages/' },
  npm: { label: 'npm', check: 'live', teaser: 'Millions of JavaScript packages, several of which pad strings.', linkLabel: 'npm', urlPrefix: 'https://www.npmjs.com/package/' },
  crates: { label: 'crates.io', check: 'bloom', teaser: 'Rust crates with blazingly fast, memory-safe names.', linkLabel: 'crates.io', urlPrefix: 'https://crates.io/crates/' },
  rubygems: { label: 'RubyGems', check: 'bloom', teaser: 'Ruby gems, where every name is a pun.', linkLabel: 'RubyGems', urlPrefix: 'https://rubygems.org/gems/' },
  mixed: { label: 'Mixed bag', check: null, teaser: 'A bit of everything. Good luck.', linkLabel: null, urlPrefix: null },
};
