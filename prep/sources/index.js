import { cranSource } from './cran.js';
import { biocSource } from './bioc.js';
import { pypiSource } from './pypi.js';
import { openvsxSource } from './openvsx.js';
import { npmSource } from './npm.js';
import { cratesSource } from './crates.js';
import { rubygemsSource } from './rubygems.js';

const deps = { log: console.log };

export const SOURCES = {
  cran: cranSource(deps),
  bioc: biocSource(deps),
  pypi: pypiSource(deps),
  openvsx: openvsxSource(deps),
  npm: npmSource(deps),
  crates: cratesSource(deps),
  rubygems: rubygemsSource(deps),
};
