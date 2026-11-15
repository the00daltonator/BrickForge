import { CharacterSpec, PRESETS, HairStyle, Headwear, Outfit, Accessory, Ears, normalizeSpec } from './character';
import { VehicleSpec, VEHICLE_PRESETS, normalizeVehicle } from './rigs';

// Offline idea interpreter: turns a short description into a character spec using a
// vocabulary of subjects, colors, clothing, hair and props. It never invents parts; the
// spec is built by the same deterministic character engine as the designer.
//
// `unrecognized` is set when nothing in the description matched the vocabulary. The
// result is still a buildable plain figure, and the UI tells the visitor what happened.
export type IdeaResult =
  | { kind: 'character'; spec: CharacterSpec; understood: string[]; unrecognized?: true }
  | { kind: 'vehicle'; spec: VehicleSpec; understood: string[] }
  | { kind: 'starter'; starter: string; understood: string[] };

// Whole-word matcher. Every alternative is bounded on both sides, so "cop" does not
// match "helicopter" and "rat" does not match "decorated". A plural "s" is allowed.
const words = (alternatives: string) => new RegExp(`\\b(?:${alternatives})s?\\b`);

const VEHICLE = words('car|truck|van|taxi|cab|pickup|hatchback|sedan|coupe|jeep|automobile');
const DELUXE = words('deluxe|fancy|luxury|premium|advanced|detailed');

// [words, LEGO color id]. Order matters: specific shades come before the plain color.
const COLOR_LIST: [string, number][] = [
  ['dark ?red|maroon|burgundy|crimson', 320],
  ['red', 4],
  ['dark ?orange|rust', 484],
  ['orange|ginger', 25],
  ['gold|golden', 297],
  ['blond|blonde|light yellow|pale yellow', 191],
  ['yellow', 14],
  ['dark ?tan|khaki|olive', 28],
  ['tan|beige|sand|sandy', 19],
  ['dark ?brown|chocolate', 308],
  ['brown|brunette|wood|wooden', 70],
  ['navy|dark ?blue', 272],
  ['sky ?blue|light ?blue|baby blue', 212],
  ['azure|cyan', 321],
  ['medium blue', 73],
  ['blue|denim', 1],
  ['teal|turquoise', 3],
  ['dark ?green|forest green', 288],
  ['lime', 27],
  ['bright green|neon green', 10],
  ['sage|mint', 378],
  ['green', 2],
  ['lavender|lilac', 30],
  ['dark ?purple|violet|indigo', 85],
  ['purple', 22],
  ['magenta', 26],
  ['hot pink|dark pink', 5],
  ['pink', 13],
  ['white|snowy|snow white', 15],
  ['jet black|black', 0],
  ['dark ?gr[ae]y|charcoal|dark silver', 72],
  ['silver|gr[ae]y|metal|metallic|steel', 71],
];
const COLOR_WORDS: [RegExp, number][] = COLOR_LIST.map(([w, id]) => [new RegExp(`\\b(?:${w})\\b`), id]);

const SKIN_WORDS: [RegExp, number][] = [
  [/\b(dark|deep|brown|black) skin(ned)?\b/, 308],
  [/\b(tan|olive|medium) skin(ned)?\b/, 84],
  [/\b(light|fair|pale) skin(ned)?\b/, 78],
  [/\b(classic yellow|lego yellow|yellow skin(ned)?)\b/, 14],
];

type Subject = { match: RegExp; preset: string; name?: string; changes?: Partial<CharacterSpec> };
const subject = (alternatives: string, preset: string, name?: string, changes?: Partial<CharacterSpec>): Subject => ({ match: words(alternatives), preset, name, changes });
// Animals reuse a preset's body plan with a new fur color, muzzle and ears.
const fur = (color: number, changes: Partial<CharacterSpec> = {}): Partial<CharacterSpec> => ({ skin: color, hair: color, shirt: color, pants: color, ...changes });

// Order matters: the first match wins, so specific phrases come before general words.
const SUBJECTS: Subject[] = [
  subject('astronaut|spaceman|spacewoman|cosmonaut', 'astronaut'),
  subject('knight|paladin', 'knight'),
  subject('wizard|sorcerer|mage|merlin', 'wizard'),
  subject('witch|sorceress', 'witch'),
  subject('pirate|buccaneer', 'pirate'),
  subject('ninja|samurai', 'ninja'),
  subject('princess|queen', 'princess'),
  subject('king|emperor|prince', 'king'),
  subject('fire ?fighter|fireman|firewoman', 'firefighter'),
  subject('police|policeman|policewoman|cop|officer|detective', 'police'),
  subject('builder|construction|engineer|worker|mechanic|plumber', 'builder'),
  subject('chef|cook|baker', 'chef'),
  subject('nurse|medic|paramedic', 'hero', 'Nurse', { shirt: 15, pants: 15, shoes: 15, outfit: 'emblem', accent: 4, hair: 70, hairStyle: 'bun', base: 212 }),
  subject('scientist|doctor|professor|inventor|chemist', 'scientist'),
  subject('cowboy|cowgirl|sheriff|ranger', 'cowboy'),
  subject('farmer|gardener', 'hero', 'Farmer', { shirt: 4, outfit: 'overalls', accent: 1, pants: 1, shoes: 70, headwear: 'cowboy', hat: 19, base: 2 }),
  subject('super ?hero|super ?heroine|hero with a cape', 'superhero'),
  subject('rock ?star|guitarist|musician|singer', 'rockstar'),
  subject('viking|warrior|barbarian', 'viking'),
  subject('explorer|adventurer|hiker|archaeologist|camper', 'explorer'),
  subject('pilot|aviator', 'hero', 'Pilot', { shirt: 272, outfit: 'jacket', accent: 15, pants: 72, headwear: 'cap', hat: 272, glasses: true, base: 71 }),
  subject('soldier|army|general|marine|trooper', 'hero', 'Soldier', { shirt: 288, pants: 288, shoes: 0, accent: 28, headwear: 'cap', hat: 288, base: 28 }),
  subject('athlete|runner|soccer player|footballer|football player|basketball player', 'hero', 'Athlete', { shirt: 4, outfit: 'emblem', accent: 15, pants: 15, shoes: 0, base: 2 }),
  subject('clown|jester', 'hero', 'Clown', { hair: 4, hairStyle: 'curly', shirt: 14, outfit: 'stripe', accent: 4, pants: 1, shoes: 4, base: 26 }),
  subject('santa|santa claus|father christmas', 'hero', 'Santa', { hair: 15, beard: true, shirt: 4, pants: 4, shoes: 0, accent: 15, headwear: 'wizard', hat: 4, base: 15 }),
  subject('gnome|dwarf', 'hero', 'Gnome', { hair: 15, beard: true, shirt: 1, pants: 70, shoes: 0, headwear: 'wizard', hat: 4, base: 2 }),
  subject('elf', 'hero', 'Elf', { hair: 191, shirt: 2, pants: 2, shoes: 4, outfit: 'stripe', accent: 4, headwear: 'wizard', hat: 2, base: 15 }),
  subject('fairy|pixie', 'princess', 'Fairy', { hair: 191, shirt: 10, pants: 10, accent: 14, headwear: 'bow', hat: 13, base: 2 }),
  subject('mermaid', 'hero', 'Mermaid', { hair: 4, hairStyle: 'long', shirt: 22, pants: 3, shoes: 3, base: 1 }),
  subject('vampire|dracula', 'hero', 'Vampire', { skin: 15, hair: 0, shirt: 0, outfit: 'suit', accent: 4, pants: 0, shoes: 0, cape: true, base: 72 }),
  subject('skeleton', 'hero', 'Skeleton', { skin: 15, hairStyle: 'bald', shirt: 15, outfit: 'stripe', accent: 0, pants: 15, shoes: 15, base: 72 }),
  subject('ghost|spirit', 'hero', 'Ghost', { skin: 15, hairStyle: 'bald', shirt: 15, outfit: 'robe', accent: 15, pants: 15, shoes: 15, base: 72 }),
  subject('snowman|snowwoman', 'hero', 'Snowman', { skin: 15, hairStyle: 'bald', shirt: 15, accent: 4, pants: 15, shoes: 15, headwear: 'tophat', hat: 0, base: 15 }),
  subject('zombie|monster', 'zombie'),
  subject('robot|robotic|android|droid|cyborg|mech', 'robot'),
  subject('alien|martian', 'alien'),
  subject('grandma|grandmother|granny|nana', 'hero', 'Grandma', { hair: 71, hairStyle: 'bun', glasses: true, shirt: 30, outfit: 'dress', pants: 30, accent: 15 }),
  subject('grandpa|grandfather|grandad|granddad', 'hero', 'Grandpa', { hair: 71, glasses: true, shirt: 28, outfit: 'jacket', accent: 15, pants: 72 }),
  subject('lion', 'cat', 'Lion', fur(191, { hair: 70, ears: 'bear', muzzle: 15, accent: 15, base: 28 })),
  subject('tiger', 'cat', 'Tiger', fur(25, { muzzle: 15, accent: 15 })),
  subject('kitten|kitty|cat', 'cat'),
  subject('wolf', 'fox', 'Wolf', fur(72, { muzzle: 71, accent: 71 })),
  subject('fox', 'fox'),
  subject('puppy|dog|retriever|poodle|terrier|labrador', 'dog'),
  subject('panda', 'panda'),
  subject('polar bear', 'bear', 'Polar bear', fur(15, { muzzle: 15, accent: 15, base: 212 })),
  subject('koala', 'bear', 'Koala', fur(71, { muzzle: 72, accent: 72 })),
  subject('monkey|ape|chimp|gorilla', 'bear', 'Monkey', fur(70, { ears: 'mouse', muzzle: 19, accent: 19, tail: true })),
  subject('pig|piglet|piggy', 'bear', 'Pig', fur(13, { muzzle: 5, accent: 5 })),
  subject('cow|bull', 'bear', 'Cow', fur(15, { hair: 0, muzzle: 13, accent: 13 })),
  subject('horse|pony', 'dog', 'Horse', fur(70, { hair: 0, ears: 'fox', muzzle: 19, accent: 19 })),
  subject('unicorn', 'dog', 'Unicorn', fur(15, { hair: 13, ears: 'fox', muzzle: 13, accent: 13, base: 30 })),
  subject('teddy|teddy bear|bear', 'bear'),
  subject('bunny|rabbit|hare', 'bunny'),
  subject('mouse|mice|rat|hamster', 'mouse'),
  subject('penguin', 'penguin'),
  subject('duck|duckling|chick', 'penguin', 'Duck', fur(14, { muzzle: 25, accent: 25, shoes: 25, base: 1 })),
  subject('frog|toad', 'frog'),
  subject('owl|bird|parrot', 'owl'),
  // Low priority, so "police captain" stays a police officer.
  subject('captain|sailor', 'pirate'),
];
// Words that mean "a plain person", so the description counts as understood.
const PERSON = words('person|people|man|men|woman|women|girl|boy|guy|kid|child|lady|dude|character|figure|me|myself|someone|human|friend|mom|mum|dad|brother|sister|teacher|student');

const STARTERS: [RegExp, string][] = [
  [words('rocket|spaceship|space ship'), 'Rocket'],
  [words('castle|fortress|tower'), 'Castle'],
  [words('dinosaur|dino|t-?rex|dragon'), 'Dinosaur'],
];
const HAIR: [RegExp, HairStyle][] = [
  [words('bald|no hair'), 'bald'],
  [words('ponytail|bun'), 'bun'],
  [words('spiky|spikey|punk'), 'spiky'],
  [words('curly|afro|curl'), 'curly'],
  [words('mohawk'), 'mohawk'],
  [/\bbob( cut| haircut)?\b/, 'bob'],
  [/\b(long (\w+ )?hair|braids?)\b/, 'long'],
  [/\bshort (\w+ )?hair\b/, 'short'],
];
const HATS: [RegExp, Headwear][] = [
  [words('crown|tiara'), 'crown'],
  [words('wizard hat|pointy hat|pointed hat'), 'wizard'],
  [words('witch hat'), 'witch'],
  [words('top hat'), 'tophat'],
  [words('cowboy hat'), 'cowboy'],
  [words('chef hat'), 'chef'],
  [words('hard ?hat'), 'hardhat'],
  [words('police (cap|hat)'), 'police'],
  [words('fire ?(fighter)? helmet'), 'firefighter'],
  [words('space helmet'), 'space'],
  [words('viking helmet|horned helmet'), 'viking'],
  [words('ninja mask'), 'ninja'],
  [words('pirate hat|tricorn'), 'pirate'],
  [words('helmet'), 'knight'],
  [words('baseball cap|cap'), 'cap'],
  // "a bow and arrow" is not a hair bow.
  [/\bbows?\b(?! (and|&) arrows?)/, 'bow'],
  [words('antenna|antennae'), 'antenna'],
];
const OUTFIT: [RegExp, Outfit][] = [
  [words('dress|gown|skirt'), 'dress'],
  [words('robe|cloak'), 'robe'],
  [words('stripe|striped|stripy'), 'stripe'],
  [words('jacket|coat|hoodie|lab coat'), 'jacket'],
  [words('suit|tie|tuxedo'), 'suit'],
  [words('overalls|dungarees'), 'overalls'],
  [words('logo|emblem|badge'), 'emblem'],
];
const PROPS: [RegExp, Accessory][] = [
  [words('sword|blade|katana'), 'sword'],
  [words('staff|cane|spear|pitchfork'), 'staff'],
  [words('wand'), 'wand'],
  [words('shield'), 'shield'],
  [words('backpack|rucksack|jetpack'), 'backpack'],
  [words('guitar'), 'guitar'],
];
const EAR_WORDS: [RegExp, Ears][] = [
  [/\b(cat|kitty) ears\b/, 'cat'],
  [/\b(bunny|rabbit) ears\b/, 'bunny'],
  [/\bbear ears\b/, 'bear'],
  [/\bfox ears\b/, 'fox'],
  [/\bmouse ears\b/, 'mouse'],
  [/\b(dog|puppy|floppy) ears\b/, 'dog'],
];
// "a girl with cat ears and a cowboy hat" is a girl, not a cat or a cowboy.
const WORN = /\b(?:(?:cat|kitty|bunny|rabbit|bear|fox|mouse|dog|puppy) ears|(?:wizard|witch|cowboy|chef|pirate|police|knight|viking|ninja|fire ?fighter|space) (?:hat|cap|helmet|mask))\b/g;

// Garment nouns → which spec field a color before them should set.
const TARGETS: [RegExp, keyof CharacterSpec][] = [
  [/hair|beard|mustache|fur/, 'hair'],
  [/hat|cap|helmet|crown|hood|mask|bandana/, 'hat'],
  [/eyes?/, 'eyes'],
  [/shirt|top|jacket|coat|hoodie|robe|dress|gown|sweater|armou?r|suit|uniform|tunic|cloak|body|outfit|clothes/, 'shirt'],
  [/pants|trousers|jeans|legs|shorts|skirt/, 'pants'],
  [/shoes|boots|sneakers|feet/, 'shoes'],
  [/cape|scarf|belt|stripe|stripes|logo|emblem|trim|tie|backpack|shield/, 'accent'],
  [/base|ground|stand|grass/, 'base'],
  [/skin|face/, 'skin'],
];
const HAT_COLORS: Partial<Record<Headwear, number>> = { crown: 297, wizard: 85, witch: 0, tophat: 0, cowboy: 70, chef: 15, hardhat: 14, firefighter: 4, police: 272, cap: 4, knight: 71, space: 15, pirate: 0, viking: 71, ninja: 0, bow: 13, antenna: 4 };
// "<color> <garment>" pairs, e.g. "purple robe", "long white beard", "red and white striped shirt".
const SHADE = '(?:(?:dark|light|bright|medium|hot|sky|baby|forest|pale|neon|navy|jet) )?[a-z]+';
const PAIR = new RegExp(
  '\\b(?:(?:long|short|big|little|flowing|shiny|messy|curly|spiky|fluffy|bushy|tiny|cool|fancy|a|an|the|with) )?' +
    `(${SHADE})(?: and (${SHADE}))? ` +
    '(?:(?:striped|long|short|big|little|flowing|shiny|messy|curly|spiky|fluffy|bushy|leather|denim|fancy|pointy|pointed|tall|round|magic|puffy|lab) )?' +
    '(hair|beard|mustache|fur|hat|cap|helmet|crown|hood|mask|bandana|eyes|shirt|top|jacket|coat|hoodie|robe|dress|gown|sweater|armou?r|suit|uniform|tunic|cloak|body|outfit|clothes|pants|trousers|jeans|legs|shorts|skirt|shoes|boots|sneakers|feet|cape|scarf|belt|stripes?|logo|emblem|trim|tie|backpack|shield|base|ground|stand|grass|skin|face)\\b',
  'g',
);

const firstMatch = <T>(text: string, list: [RegExp, T][]) => list.find(([re]) => re.test(text))?.[1];
// The color in a short phrase such as "dark red" (the most specific shade wins).
const colorIn = (s: string) => firstMatch(s, COLOR_WORDS);
// The color mentioned first in a longer text, with the words that named it.
function firstColor(text: string): { id: number; word: string } | undefined {
  let best: { id: number; word: string; index: number; length: number } | undefined;
  for (const [re, id] of COLOR_WORDS) {
    const m = re.exec(text);
    if (!m) continue;
    // Earliest wins; at the same position the longer phrase ("dark red") beats "red".
    const overlaps = best && m.index < best.index + best.length && best.index < m.index + m[0].length;
    if (!best || (overlaps ? m[0].length > best.length : m.index < best.index)) best = { id, word: m[0], index: m.index, length: m[0].length };
  }
  return best && { id: best.id, word: best.word };
}
const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

function interpretVehicle(text: string, name: string | undefined): IdeaResult {
  const understood: string[] = [];
  const base = words('police').test(text) ? 'police' : words('taxi|cab').test(text) ? 'taxi' : words('race|racing|sport|sporty').test(text) ? 'sports' : DELUXE.test(text) ? 'deluxe' : 'basic';
  const spec = normalizeVehicle({ ...VEHICLE_PRESETS[base] });
  understood.push(VEHICLE_PRESETS[base].name.toLowerCase());
  const color = firstColor(text);
  if (color && !words('taxi|cab|police').test(text)) {
    spec.body = color.id;
    understood.push(`${color.word} body`);
  }
  if (/\b(opening doors?|doors? (that )?open|working doors?)\b/.test(text) && spec.doors === 'fixed') spec.doors = 'basic';
  if (DELUXE.test(text)) {
    spec.doors = 'fancy';
    spec.hood = true;
    spec.trunk = true;
  }
  if (words('hood|bonnet|engine').test(text)) {
    spec.hood = true;
    understood.push('opening hood');
  }
  if (words('trunk|boot|tailgate').test(text)) {
    spec.trunk = true;
    understood.push('opening trunk');
  }
  if (/\b(no (moving|opening)|fixed doors?|simple)\b/.test(text)) {
    spec.doors = 'fixed';
    spec.hood = false;
    spec.trunk = false;
  }
  if (words('stripe|striped').test(text)) spec.stripe = true;
  understood.push(spec.doors === 'fixed' ? 'fixed doors' : spec.doors === 'basic' ? 'doors on hinge plates' : 'doors on hinge bricks');
  if (name) spec.name = name;
  return { kind: 'vehicle', spec, understood };
}

export function interpretIdea(input: string): IdeaResult {
  // A name ("named Bob", "called King") is kept aside so it is not read as a description.
  const named = input.match(/\b(?:named|called)\s+([A-Za-z][\w'-]{1,24})/);
  const name = named ? capital(named[1]) : undefined;
  const text = ` ${(named ? input.replace(named[0], ' ') : input).toLowerCase().replace(/[^a-z0-9' -]+/g, ' ').replace(/\s+/g, ' ')} `;
  const understood: string[] = [];
  if (VEHICLE.test(text)) return interpretVehicle(text, name);

  const subjectText = text.replace(WORN, ' ');
  const found = SUBJECTS.find(s => s.match.test(subjectText));
  if (!found) {
    const starter = firstMatch(text, STARTERS);
    if (starter) return { kind: 'starter', starter, understood: [`${starter.toLowerCase()} starter build`] };
  }
  const spec: CharacterSpec = normalizeSpec({ ...PRESETS[found?.preset ?? 'hero'], ...found?.changes });
  const subjectName = found ? (found.name ?? PRESETS[found.preset].name) : undefined;
  if (subjectName) understood.push(subjectName.toLowerCase());

  let rest = text;
  for (const m of text.matchAll(PAIR)) {
    const first = colorIn(` ${m[1]} `);
    const c = first ?? (m[2] ? colorIn(` ${m[2]} `) : undefined);
    if (c === undefined) continue;
    const garment = m[3];
    const field = TARGETS.find(([re]) => re.test(garment))?.[1];
    if (!field) continue;
    (spec as Record<string, unknown>)[field] = c;
    understood.push(`${first !== undefined ? m[1] : m[2]} ${garment}`);
    rest = rest.replace(m[0], ' ');
    if (field === 'hair' && /beard|mustache/.test(garment)) spec.beard = true;
    if (field === 'shirt' && /robe|cloak/.test(garment)) spec.outfit = 'robe';
    if (field === 'shirt' && /dress|gown/.test(garment)) spec.outfit = 'dress';
    if (field === 'accent' && /cape/.test(garment)) spec.cape = true;
    if (field === 'accent' && /stripe/.test(garment)) spec.outfit = 'stripe';
    if (field === 'hair' && /fur/.test(garment)) {
      spec.skin = c;
      spec.hair = c;
    }
  }
  // A color on its own: "an orange cat" sets the fur, "a blue ninja" sets the clothes.
  // Colors already used by a garment ("a cat with a red scarf") are not counted again.
  const lone = firstColor(rest);
  if (lone && spec.kind === 'animal' && !understood.some(u => /fur$/.test(u))) {
    spec.skin = lone.id;
    spec.hair = lone.id;
    spec.shirt = lone.id;
    spec.pants = lone.id;
    understood.push(`${lone.word} fur`);
  } else if (lone && found && spec.kind !== 'animal' && new RegExp(`\\b${lone.word} (?:\\w+ )?${found.match.source.slice(2)}`).test(rest) && !understood.some(u => TARGETS[3][0].test(u))) {
    const matching = spec.pants === spec.shirt;
    spec.shirt = lone.id;
    if (matching) spec.pants = lone.id;
    if (spec.kind === 'robot') spec.skin = lone.id;
    understood.push(`${lone.word} ${spec.kind === 'robot' ? 'body' : 'outfit'}`);
  }
  const skin = firstMatch(text, SKIN_WORDS);
  if (skin !== undefined && spec.kind === 'person') {
    spec.skin = skin;
    understood.push('skin tone');
  }
  const hair = firstMatch(text, HAIR);
  if (hair && spec.kind === 'person') {
    spec.hairStyle = hair;
    understood.push(`${hair} hair`);
  }
  // Generic words ("helmet", "cap") keep a subject's own headwear; specific hats replace it.
  const hat = firstMatch(text, HATS),
    generic = hat === 'knight' || hat === 'cap';
  if (hat && !(generic && spec.headwear !== 'none')) {
    const colored = understood.some(u => /(hat|cap|helmet|crown|hood|mask|bandana)$/.test(u));
    spec.headwear = hat;
    if (!colored) spec.hat = HAT_COLORS[hat] ?? spec.hat;
    understood.push(hat === 'knight' ? 'helmet' : hat === 'tophat' ? 'top hat' : hat === 'hardhat' ? 'hard hat' : hat === 'bow' ? 'hair bow' : `${hat} hat`.replace(/^(cap|crown|antenna) hat$/, '$1'));
  }
  const outfit = firstMatch(text, OUTFIT);
  if (outfit && spec.kind !== 'animal') {
    spec.outfit = outfit;
    understood.push(outfit);
  }
  const prop = firstMatch(text, PROPS);
  if (prop) {
    spec.accessory = prop;
    understood.push(prop);
  }
  const ears = firstMatch(text, EAR_WORDS);
  if (ears) {
    spec.ears = ears;
    understood.push(`${ears} ears`);
  }
  if (/\bcape\b/.test(text) && !/\bno cape\b/.test(text)) {
    spec.cape = true;
    if (!understood.some(u => /cape$/.test(u))) understood.push('cape');
  }
  if (words('beard|bearded|mustache|moustache').test(text) && spec.kind === 'person') {
    spec.beard = true;
    if (!understood.some(u => /beard|mustache/.test(u))) understood.push('beard');
  }
  if (words('glasses|goggles|spectacles|sunglasses').test(text)) {
    spec.glasses = true;
    understood.push('glasses');
  }
  if (/\b(no beard|clean ?shaven)\b/.test(text)) spec.beard = false;
  if (/\bno hat\b/.test(text)) spec.headwear = 'none';
  if (/\btail\b/.test(text)) spec.tail = true;
  if (/\b(minifig|minifigs|minifigure|minifigures|mini figure)\b/.test(text) && spec.kind !== 'animal') {
    spec.format = 'minifig';
    understood.push('minifigure');
  } else if (/\b(ball[- ]joints?|deluxe|super[- ]?posable|fully posable)\b/.test(text)) {
    spec.rig = 'fancy';
    understood.push('ball joints');
  } else if (/\b(posable|poseable|movable|moveable|moving (arms|legs|parts)|articulated|action figure|joints?|bendy)\b/.test(text)) {
    spec.rig = 'basic';
    understood.push('posable joints');
  }
  spec.name = name ?? subjectName ?? 'My character';

  // Nothing matched: no subject, no person word, no color, clothing or prop.
  const unrecognized = !found && !understood.length && !PERSON.test(text);
  if (!found) understood.unshift(unrecognized ? 'a plain figure' : 'a character');
  const result: IdeaResult = { kind: 'character', spec: normalizeSpec(spec), understood: [...new Set(understood)] };
  if (unrecognized) result.unrecognized = true;
  return result;
}
