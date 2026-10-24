// Validates every example against its hitl v0 schema, checks that every file
// under tests/invalid fails, and recomputes the hash and signature test vectors.
// Exit code 1 on any failure.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const list = (dir) => fs.existsSync(path.join(root, dir))
  ? fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith('.json')).sort().map((f) => `${dir}/${f}`)
  : [];

const ajv = new Ajv2020({ strict: true, strictRequired: false, strictTypes: false, allErrors: true });
addFormats(ajv);
for (const name of ['event', 'request', 'response']) ajv.addSchema(read(`schemas/v0/${name}.json`));
const validators = {
  request: ajv.getSchema('https://hitly.net/spec/hitl/v0/request.json'),
  response: ajv.getSchema('https://hitly.net/spec/hitl/v0/response.json'),
  event: ajv.getSchema('https://hitly.net/spec/hitl/v0/event.json'),
};
const kindOf = { requests: 'request', responses: 'response', events: 'event' };

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`FAIL ${msg}`); };
const pass = (msg) => console.log(`ok   ${msg}`);

// 1. Valid examples
for (const dir of Object.keys(kindOf)) {
  for (const file of list(`examples/${dir}`)) {
    const v = validators[kindOf[dir]];
    if (v(read(file))) pass(file);
    else fail(`${file}\n${JSON.stringify(v.errors, null, 2)}`);
  }
}

// 2. Must-fail cases
for (const dir of Object.keys(kindOf)) {
  for (const file of list(`tests/invalid/${dir}`)) {
    const v = validators[kindOf[dir]];
    if (v(read(file))) fail(`${file} was accepted but must be refused`);
    else pass(`${file} refused as expected (${v.errors[0].instancePath || '/'} ${v.errors[0].message})`);
  }
}

// 3. Test vectors. jcs() covers the JSON used here (strings, integers, booleans,
// null, arrays, objects); it is not a complete RFC 8785 implementation.
const jcs = (v) => {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(jcs).join(',')}]`;
  return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${jcs(v[k])}`).join(',')}}`;
};
const sha = (s) => crypto.createHash('sha256').update(s).digest('base64url');

for (const vec of read('examples/vectors/args-hash.json')) {
  if (jcs(vec.args) !== vec.jcs) fail(`args-hash ${vec.name}: JCS mismatch`);
  else if (sha(vec.jcs) !== vec.argsHash) fail(`args-hash ${vec.name}: hash mismatch`);
  else pass(`vectors/args-hash ${vec.name}`);
}

const chain = read('examples/vectors/event-chain.json');
let prev = null;
for (const e of chain) {
  if (!validators.event(e)) fail(`event-chain ${e.id} schema\n${JSON.stringify(validators.event.errors)}`);
  const { hash, ...rest } = e;
  if (e.prevHash !== prev) fail(`event-chain ${e.id}: prevHash does not link`);
  else if (sha(jcs(rest)) !== hash) fail(`event-chain ${e.id}: hash mismatch`);
  else pass(`vectors/event-chain ${e.id}`);
  prev = hash;
}

const keys = read('examples/keys/hitl-keys.json').keys;
for (const file of list('examples/responses')) {
  const resp = read(file);
  if (resp.signature === null || resp.signature === undefined) continue;
  const jwk = keys.find((k) => k.kid === resp.signature.kid);
  if (!jwk) { fail(`${file}: unknown kid ${resp.signature.kid}`); continue; }
  const { signature, ...unsigned } = resp;
  const key = crypto.createPublicKey({ key: { kty: jwk.kty, crv: jwk.crv, x: jwk.x }, format: 'jwk' });
  if (crypto.verify(null, Buffer.from(jcs(unsigned)), key, Buffer.from(signature.sig, 'base64url'))) pass(`${file} signature`);
  else fail(`${file}: signature does not verify`);
}

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nAll checks passed');
