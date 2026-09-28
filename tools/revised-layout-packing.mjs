import assert from 'node:assert/strict';

// Build-time only. Runtime needs split/join and JSON.parse, not Node/zlib,
// atob, network assets, or a new platform dependency.
export function packLayoutJson(value) {
  const original = JSON.stringify(value);
  assert(!original.includes('~'), 'Reserved compact-layout marker');
  const tokens = original.match(/"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?|true|false|null|[{}\[\],:]/g);
  assert.equal(tokens.join(''), original, 'Only ordinary JSON is accepted');
  const counts = new Map();
  for (let start = 0; start < tokens.length; start++) {
    let phrase = '';
    for (let length = 1; length <= 18 && start + length <= tokens.length; length++) {
      phrase += tokens[start + length - 1];
      if (phrase.length >= 7 && phrase.length <= 180) counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
    }
  }
  const candidates = [...counts].filter(([, n]) => n > 2)
    .map(([phrase, n]) => ({phrase, estimate: (phrase.length - 4) * (n - 1)}))
    .sort((a, b) => b.estimate - a.estimate).slice(0, 6000);
  let text = original;
  const dictionary = [];
  while (dictionary.length < 256) {
    const marker = '~' + dictionary.length.toString(36) + ';';
    let best, bestParts, gain = 12;
    for (const candidate of candidates) {
      if (candidate.removed) continue;
      const parts = text.split(candidate.phrase);
      if (parts.length < 3) { candidate.removed = true; continue; }
      const saving = (parts.length - 1) * (JSON.stringify(candidate.phrase).length - 2 - marker.length)
        - JSON.stringify(candidate.phrase).length - 1;
      if (saving > gain) { best = candidate; bestParts = parts; gain = saving; }
    }
    if (!best) break;
    dictionary.push(best.phrase);
    text = bestParts.join(marker);
    best.removed = true;
  }
  assert.deepEqual(unpackLayoutJson(text, dictionary), value);
  return {text, dictionary, originalBytes: Buffer.byteLength(original),
    packedBytes: Buffer.byteLength(JSON.stringify([text, dictionary]))};
}

export function unpackLayoutJson(text, dictionary) {
  for (let i = 0; i < dictionary.length; i++) text = text.split('~' + i.toString(36) + ';').join(dictionary[i]);
  return JSON.parse(text);
}
