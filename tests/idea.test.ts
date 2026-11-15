import assert from 'node:assert/strict';
import { interpretIdea, IdeaResult } from '../lib/idea';
import { characterModel } from '../lib/character';
import { checks, observedColor, part } from '../lib/brick-engine';

const character = (text: string) => {
  const r = interpretIdea(text);
  assert(r.kind === 'character', `"${text}" is a character`);
  return r as Extract<IdeaResult, { kind: 'character' }>;
};
const named = (text: string) => character(text).spec.name;

// Words only match whole words: "cop" is not in "helicopter", "rat" is not in "decorated".
assert.equal(named('a helicopter pilot'), 'Pilot');
assert.equal(named('a decorated general'), 'Soldier');
assert.equal(named('a girl from the kingdom'), 'My character');
assert.equal(character('a cutie with pink hair').spec.outfit, 'plain', '"cutie" is not a tie');
assert.equal(character('a knight dressed in black armor').spec.outfit, 'emblem', '"dressed" is not a dress');
assert.equal(character('a girl with a thousand freckles').spec.shirt, 4, '"thousand" is not sand');
assert.equal(character('an archer with a bow and arrow').spec.headwear, 'none', 'a bow and arrow is not a hair bow');
console.log('PASS: whole-word matching.');

// Names are kept out of the description, and clothing words do not pick the subject.
const bob = character('a boy named Bob');
assert.equal(bob.spec.name, 'Bob');
assert.equal(bob.spec.hairStyle, 'short', 'the name Bob is not a bob haircut');
const girl = character('a girl with cat ears and a cowboy hat');
assert.equal(girl.spec.kind, 'person');
assert.equal(girl.spec.ears, 'cat');
assert.equal(girl.spec.headwear, 'cowboy');
assert.equal(named('police captain'), 'Police officer');
assert.equal(named('a pirate captain'), 'Pirate');
console.log('PASS: names and worn items do not change the subject.');

// A color on its own colors the subject; colors that belong to a garment are not reused.
const cat = character('an orange cat with a red scarf');
assert.equal(cat.spec.skin, 25);
assert.equal(cat.spec.accent, 4);
const ninja = character('a blue ninja');
assert.equal(ninja.spec.shirt, 1);
assert.equal(ninja.spec.pants, 1);
assert.equal(character('a dark red robot').spec.skin, 320);
assert.equal(character('a wizard with a golden staff').spec.shirt, 85, 'a prop color leaves the outfit alone');
const car = interpretIdea('a yellow truck named Bumble');
assert(car.kind === 'vehicle' && car.spec.body === 14 && car.spec.name === 'Bumble');
console.log('PASS: lone colors apply to the subject.');

// Every subject added on top of the designer presets builds a connected, supported figure
// from part/color combinations that exist in the catalog.
const SUBJECTS = ['nurse', 'farmer', 'pilot', 'soldier', 'athlete', 'clown', 'santa', 'gnome', 'elf', 'fairy', 'mermaid', 'vampire', 'skeleton', 'ghost', 'snowman', 'grandma', 'grandpa', 'lion', 'tiger', 'wolf', 'polar bear', 'koala', 'monkey', 'pig', 'cow', 'horse', 'unicorn', 'duck'];
for (const word of SUBJECTS) {
  const idea = character(`a ${word}`);
  assert.equal(idea.spec.name.toLowerCase(), word, `"${word}" is recognized`);
  assert(!idea.unrecognized);
  const model = characterModel(idea.spec), c = checks(model.bricks, model.joints);
  assert(c.passed, `${word} passes connection checks`);
  assert.equal(c.overlaps, 0, `${word} has no overlaps`);
  const gaps = model.bricks.filter(b => part(b.part) && !observedColor(b.part, b.color));
  assert.equal(gaps.length, 0, `${word} uses real part/color combinations`);
}
console.log(`PASS: ${SUBJECTS.length} extra subjects build connected figures from real part colors.`);

// Descriptions outside the vocabulary are flagged instead of silently becoming a person.
for (const text of ['a house', 'a shark', 'an airplane', 'something cool', '']) assert(character(text).unrecognized, `"${text}" is flagged`);
for (const text of ['a man', 'someone in a red shirt', 'a wizard', 'green hair and glasses']) assert(!character(text).unrecognized, `"${text}" is understood`);
assert.equal(interpretIdea('a dragon').kind, 'starter');
console.log('PASS: unrecognized ideas are flagged.');
