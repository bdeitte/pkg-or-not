// End-of-game sayings by ecosystem and score band.

import { pick, randInt } from './shared/rng.js';
import { bandFor } from './game.js';

export const SAYINGS = {
  cran: {
    low: [
      "You've clearly never had to run install.packages() on a Friday afternoon.",
      'CRAN would like a word. Several words, actually, all in the check log.',
    ],
    mid: [
      "Respectable. You've read a few DESCRIPTION files.",
      'Half the time you know your R. The other half you know your guesses.',
    ],
    high: [
      'You dream in tidyverse function names.',
      'Your .Rprofile is showing, and it is impressive.',
    ],
    perfect: [
      'Are you secretly a CRAN maintainer? Blink twice.',
      'Ten for ten. Somewhere, a package named after you is passing R CMD check.',
    ],
  },
  bioc: {
    low: [
      "Don't worry, most biologists can't tell either.",
      'Your results are not statistically significant.',
    ],
    mid: [
      "Solid work. You'd survive a lab meeting.",
      "Half right. That's a better hit rate than most microarrays.",
    ],
    high: [
      "You've clearly spent time with Bioconductor's release notes.",
      'Peer reviewed and accepted with minor revisions.',
    ],
    perfect: [
      'Perfect score. The genome has nothing left to teach you.',
      'Ten out of ten. Your p-value is effectively zero.',
    ],
  },
  pypi: {
    low: [
      'Somebody has already registered your guesses. Probably as a joke.',
      'Maybe try pip install intuition.',
    ],
    mid: [
      "Not bad. You've scrolled past a few requirements.txt files.",
      'Half right. Like a virtualenv that mostly works.',
    ],
    high: [
      'You know PyPI better than PyPI does.',
      'Your pip cache is proud of you.',
    ],
    perfect: [
      'Flawless. You have clearly squatted a few names yourself.',
      'Ten for ten. import genius works on your machine.',
    ],
  },
  openvsx: {
    low: [
      'Your editor has 80 extensions installed and you picked none of them.',
      'Maybe install an extension that guesses for you.',
    ],
    mid: [
      "Not bad. You've scrolled the marketplace sidebar a few times.",
      'Half right, like a theme that only works in dark mode.',
    ],
    high: [
      'Your settings.json is longer than most novels.',
      'You reload the window before anyone asks you to.',
    ],
    perfect: [
      'Ten for ten. Your status bar has no space left.',
      'Flawless. You have clearly published an Icon Theme Pro or two.',
    ],
  },
  npm: {
    low: [
      "Relax, there's probably a package for that. Maybe even one of the fake ones.",
      'Your guesses have more vulnerabilities than an unpatched lockfile.',
    ],
    mid: [
      'Half right, which is more than most dependency trees.',
      "Respectable. You've survived a few npm audit reports.",
    ],
    high: [
      'Your node_modules folder is bigger than your house.',
      "You've clearly read a package-lock.json for fun.",
    ],
    perfect: [
      'You have typed npm install more times than you have blinked.',
      'Ten for ten. Somewhere, a package called is-you just published a new version.',
    ],
  },
  crates: {
    low: [
      'The borrow checker rejects your answers.',
      "Your guesses didn't compile. Try adding more lifetimes.",
    ],
    mid: [
      'Half right. Unsafe, but it runs.',
      "Decent. You've seen a Cargo.toml or two.",
    ],
    high: [
      'Blazingly accurate.',
      'Your answers are memory-safe and nearly correct.',
    ],
    perfect: [
      'Ten for ten. Zero-cost accuracy.',
      'Perfect. Even the borrow checker is impressed.',
    ],
  },
  rubygems: {
    low: [
      'Your guesses have been yanked.',
      'Maybe bundle install some intuition.',
    ],
    mid: [
      'Half right. Convention over configuration, mostly.',
      "Not bad. You've read a Gemfile or two.",
    ],
    high: [
      'You clearly optimize for developer happiness.',
      'Shiny work. Your guesses sparkle.',
    ],
    perfect: [
      'Ten for ten. Matz would be proud.',
      'Perfect. You must have a gem for this.',
    ],
  },
  mixed: {
    low: [
      "Every ecosystem fooled you equally. That's fairness.",
      'Package naming is hard. So is guessing, apparently.',
    ],
    mid: [
      'A solid polyglot showing.',
      "Half right across every registry. That's still a lot of registries.",
    ],
    high: [
      "You've clearly installed things in every language.",
      'A true polyglot. Your PATH must be enormous.',
    ],
    perfect: [
      'Ten for ten across every registry. Are you a package manager?',
      'Perfect. You have seen every package, in every language.',
    ],
  },
};

export function pickSaying(eco, score, rng) {
  return pick(rng, SAYINGS[eco][bandFor(score)]);
}

// Index form, so a shared results link can show the same saying.
export function pickSayingIndex(eco, score, rng) {
  return randInt(rng, SAYINGS[eco][bandFor(score)].length);
}

export function sayingAt(eco, score, index) {
  const list = Object.hasOwn(SAYINGS, eco) ? SAYINGS[eco][bandFor(score)] : null;
  return list && Number.isInteger(index) && index >= 0 && index < list.length ? list[index] : null;
}

// Shown when the player correctly calls a fake name fake.
export const FAKE_CAUGHT = [
  'Nobody has claimed this name... yet.',
  'Good eye. This one only exists in a Markov chain.',
  'Fake! Though someone will probably publish it by Tuesday.',
  'No such package. The namespace is wide open, if you want it.',
  'Correctly spotted. This name was assembled from spare parts.',
  'Fake. Not even a squatter has found this one.',
  'Nice catch. The registry has never heard of it.',
  'Made up by a robot, caught by a human.',
  'Pure fiction. Zero downloads, zero maintainers, zero issues.',
  'You saw right through it. There is no README for this one.',
  'Fake. It sounds useful, which is the dangerous part.',
  'Correct. This name has no version, no license and no author.',
  'Spotted. The only thing depending on this package is this game.',
  'Fake. Install it and you get nothing but an error message.',
  'Well caught. It looked plausible, but it was just letters in a trench coat.',
  'Busted. That name never made it past the idea stage.',
  'Right call. You can smell a fake from a mile away.',
  'Fake. It would have looked great in a changelog, though.',
  'Sharp. That one would not survive a dependency audit.',
  'Good instincts. Something about it just felt off, right?',
];

export function pickFakeCaught(rng) {
  return pick(rng, FAKE_CAUGHT);
}

// Shown when the player calls a fake name real.
export const FAKE_MISSED = [
  'That one was invented about two seconds ago.',
  'Confidently wrong. Very on brand for dependency management.',
  'Your code review would have caught that. Probably.',
  'Sounds legit, right? That is the whole trick.',
  'You trusted it. It did not deserve that.',
  'A lovely name for a package that will never exist.',
  'Nope. That one came straight out of a random number generator.',
  'It fooled you, and it was not even trying.',
  'Real enough for a pull request, fake enough to break the build.',
  'It has the look of a real package and none of the code.',
  'You have been had by a string of characters.',
  'Fake. You were ready to add it to your dependencies, weren\'t you?',
  'This one would pass a quick skim of a lockfile. That is the scary part.',
  'Nothing behind this name. Not even an empty repo.',
  'Believable enough to fool you. Not real enough to ship.',
  'Gotcha. No one has ever written a line of code for this.',
  'You were one bad guess away from a very confusing afternoon.',
  'Plausible, polished and completely imaginary.',
  'Fake. Do not feel bad, it fooled the spellchecker too.',
  'The name checks out. The package does not.',
];

export function pickFakeMissed(rng) {
  return pick(rng, FAKE_MISSED);
}
