// Turns a headline into a small set of concepts a world can be built from. Everything here is word
// lists and counting -- no model call, so it costs nothing and never goes down. It will not always be
// right about what a headline "means", but it only has to be interesting, not accurate.

const BIOMES = {
 desert: ['desert', 'sand', 'drought', 'sahara', 'dune', 'arid', 'heat', 'wildfire', 'fire'],
 ocean: ['ocean', 'sea', 'wave', 'coast', 'tide', 'water', 'flood', 'rain', 'storm', 'hurricane', 'fish', 'whale', 'ship', 'boat'],
 ice: ['ice', 'snow', 'arctic', 'antarctic', 'frozen', 'glacier', 'winter', 'cold', 'blizzard'],
 forest: ['forest', 'tree', 'jungle', 'wood', 'green', 'plant', 'garden', 'nature', 'animal', 'wildlife'],
 mountain: ['mountain', 'peak', 'volcano', 'earthquake', 'cliff', 'summit', 'quake', 'eruption'],
 city: ['city', 'street', 'building', 'election', 'government', 'court', 'law', 'police', 'traffic', 'mayor', 'downtown', 'housing'],
 space: ['space', 'nasa', 'rocket', 'planet', 'star', 'moon', 'mars', 'orbit', 'satellite', 'galaxy', 'astronaut'],
 tech: ['ai', 'software', 'app', 'internet', 'computer', 'chip', 'robot', 'data', 'code', 'startup', 'tech', 'phone', 'browser']
}

const MOODS = {
 // each maps to a palette and a weather feel; order matters only for the tie-break
 alarming: ['crisis', 'war', 'attack', 'disaster', 'crash', 'death', 'dead', 'kill', 'fear', 'threat', 'danger', 'collapse', 'emergency', 'warns', 'fraud', 'scandal', 'flee', 'flood', 'hurricane', 'storm', 'evacuat', 'destroy'],
 bright: ['win', 'record', 'launch', 'breakthrough', 'success', 'celebrat', 'hope', 'best', 'grow', 'boom', 'discover', 'award'],
 calm: ['study', 'report', 'plan', 'quiet', 'slow', 'review', 'guide', 'history', 'research']
}

const CREATURES = {
 people: ['president', 'ceo', 'minister', 'scientist', 'team', 'founder', 'developer', 'player', 'company', 'startup', 'government'],
 animal: ['animal', 'whale', 'fish', 'bird', 'dog', 'cat', 'bear', 'wildlife', 'insect', 'shark'],
 machine: ['robot', 'ai', 'rocket', 'car', 'drone', 'satellite', 'computer', 'chip', 'machine'],
 treasure: ['money', 'gold', 'billion', 'million', 'price', 'market', 'stock', 'fund', 'economy', 'wealth']
}

const INTENSIFIERS = ['massive', 'record', 'historic', 'huge', 'major', 'unprecedented', 'giant', 'tiny', 'small', 'first', 'biggest', 'worst']

// Action/relation words: what a headline says is happening *between* two things, used to draw a
// visual relation (a glowing link, a scale or colour change) between two placed objects rather than
// just scattering them. 'link' is the fallback: present, but no particular relationship implied.
const RELATIONS = {
 clash: ['attack', 'war', 'fight', 'battle', 'clash', 'strike', 'invade', 'kill', 'crash', 'collide', 'destroy'],
 bond: ['meet', 'talks', 'summit', 'agree', 'deal', 'partner', 'unite', 'join', 'merge', 'alliance', 'peace'],
 boost: ['launch', 'win', 'record', 'boost', 'grow', 'breakthrough', 'discover', 'rescue', 'save', 'help'],
 flee: ['flee', 'evacuat', 'escape', 'collapse', 'sink', 'flood', 'crash', 'drop', 'fall', 'plunge']
}

const words = text => (text.toLowerCase().match(/[a-z]+/g) || [])

function scoreGroups(tokens, groups) {
 const scores = {}
 for (const [name, list] of Object.entries(groups)) {
  scores[name] = 0
  for (const t of tokens) for (const w of list) if (t.includes(w) || w.includes(t)) { scores[name]++; break }
 }
 return scores
}

const topOf = (scores, fallback) => {
 let best = fallback, bestScore = 0
 for (const [name, score] of Object.entries(scores)) if (score > bestScore) { best = name; bestScore = score }
 return best
}

// Proper-noun-ish phrases from the original (unlowercased) text: capitalised words that are not the
// first word of the headline, so "Scientists" (sentence case) is skipped but "NASA" or "Mars" is kept.
// Used only as flavour labels near placed objects; never required for anything to work.
function properNouns(text) {
 const raw = String(text || '').trim().split(/\s+/)
 const out = []
 for (let i = 1; i < raw.length; i++) {
  const w = raw[i].replace(/[^A-Za-z]/g, '')
  if (w.length > 1 && w[0] === w[0].toUpperCase() && w[0] !== w[0].toLowerCase() && !out.includes(w)) out.push(w)
 }
 return out.slice(0, 3)
}

// The concepts a headline suggests: a biome, a mood, up to three kinds of thing to place, a relation
// between them, and how intense the wording is (word count is a cheap proxy when no intensifier is
// present).
export function parseHeadline(headline) {
 const text = String(headline || '').trim()
 const tokens = words(text)
 const biomeScores = scoreGroups(tokens, BIOMES)
 const moodScores = scoreGroups(tokens, MOODS)
 const creatureScores = scoreGroups(tokens, CREATURES)
 const relationScores = scoreGroups(tokens, RELATIONS)
 const biome = topOf(biomeScores, 'forest')
 const mood = topOf(moodScores, 'calm')
 const creatures = Object.entries(creatureScores).filter(([, s]) => s > 0).map(([name]) => name)
 if (!creatures.length) creatures.push('people')
 const relation = topOf(relationScores, 'link')
 const intensifierHits = INTENSIFIERS.filter(w => tokens.includes(w)).length
 const intensity = Math.max(1, Math.min(5, intensifierHits * 2 + Math.round(tokens.length / 6)))
 return { headline: text, tokens, biome, mood, creatures: creatures.slice(0, 3), relation, subjects: properNouns(text), intensity }
}

export const BIOME_NAMES = Object.keys(BIOMES)
export const MOOD_NAMES = Object.keys(MOODS)
export const CREATURE_NAMES = Object.keys(CREATURES)
export const RELATION_NAMES = Object.keys(RELATIONS).concat('link')
