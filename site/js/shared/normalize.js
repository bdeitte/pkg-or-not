// Turns a package name into the key each registry uses to decide if two names are the same.

export function normalize(eco, name) {
  switch (eco) {
    case 'pypi':
      return name.toLowerCase().replace(/[-_.]+/g, '-');
    case 'openvsx':
      return name.toLowerCase().trim().replace(/\s+/g, ' ');
    case 'crates':
      return name.toLowerCase().replace(/_/g, '-');
    case 'npm':
    case 'rubygems':
    case 'cran':
    case 'bioc':
      return name.toLowerCase();
    default:
      throw new Error(`Unknown ecosystem: ${eco}`);
  }
}
