import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../site/js/shared/normalize.js';

test('pypi follows PEP 503', () => {
  assert.equal(normalize('pypi', 'Foo__Bar.baz'), 'foo-bar-baz');
  assert.equal(normalize('pypi', 'foo-._bar'), 'foo-bar');
});

test('crates treats _ and - the same and ignores case', () => {
  assert.equal(normalize('crates', 'Serde_JSON'), 'serde-json');
});

test('cran and bioc compare case-insensitively', () => {
  assert.equal(normalize('cran', 'ggPlot2'), normalize('cran', 'ggplot2'));
  assert.equal(normalize('bioc', 'DESeq2'), 'deseq2');
});

test('npm lowercases and keeps the scope', () => {
  assert.equal(normalize('npm', '@Types/Node'), '@types/node');
});

test('rubygems lowercases', () => {
  assert.equal(normalize('rubygems', 'Rails'), 'rails');
});

test('openvsx lowercases, trims and collapses spaces in display names', () => {
  assert.equal(normalize('openvsx', '  Git   Graph '), 'git graph');
  assert.equal(normalize('openvsx', 'YAML'), 'yaml');
});

test('unknown ecosystem throws', () => {
  assert.throws(() => normalize('cobol', 'x'), /Unknown ecosystem/);
});
