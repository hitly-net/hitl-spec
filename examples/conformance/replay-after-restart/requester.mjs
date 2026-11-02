// A reference requester for run.mjs. It acts once on one hitl response, as SPEC.md section 3.8 asks.
// HITL_STORE=memory swaps the durable record for a set in memory, which is the control case.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const env = process.env;
const { requestId } = JSON.parse(fs.readFileSync(env.HITL_RESPONSE_FILE, 'utf8'));

function appendDurably(file, line) {
  const fd = fs.openSync(file, 'a');
  fs.writeSync(fd, line + '\n');
  fs.fsyncSync(fd);
  fs.closeSync(fd);
}

// Stops here and waits for run.mjs to kill the process from outside.
function checkpoint(name) {
  if (env.HITL_KILL_AT !== name) return;
  fs.writeSync(1, `at ${name}\n`);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0);
}

const durable = {
  file: (suffix) => path.join(env.HITL_STATE_DIR, createHash('sha256').update(requestId).digest('hex') + suffix),
  claim() {
    try {
      const fd = fs.openSync(this.file('.used'), 'wx');
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      return true;
    } catch (err) {
      if (err.code === 'EEXIST') return false;
      throw err;
    }
  },
  finish() {
    appendDurably(this.file('.done'), 'done');
  },
  outcomeOfUsed() {
    return fs.existsSync(this.file('.done')) ? 'refused' : 'unknown';
  },
};

const memory = {
  used: new Set(),
  claim() {
    if (this.used.has(requestId)) return false;
    this.used.add(requestId);
    return true;
  },
  finish() {},
  outcomeOfUsed() {
    return 'refused';
  },
};

const store = env.HITL_STORE === 'memory' ? memory : durable;

function present() {
  if (!store.claim()) return store.outcomeOfUsed();
  checkpoint('afterRecord');
  appendDurably(env.HITL_EFFECTS_FILE, requestId);
  checkpoint('afterEffect');
  store.finish();
  return 'acted';
}

for (let i = 0; i < Number(env.HITL_PRESENT); i++) {
  fs.writeSync(1, `outcome ${present()}\n`);
}
