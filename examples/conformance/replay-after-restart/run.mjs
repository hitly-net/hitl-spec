#!/usr/bin/env node
// Replay after restart: kills a requester at each point in cases.json, restarts it, then counts
// effects in a file that stands for the outside system. See README.md.
//
//   node run.mjs                     tests requester.mjs and the memory-only control
//   node run.mjs python my_agent.py  tests your own requester, without the control
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const responseFile = path.join(here, '../../responses/08-answered-contract.json');
const cases = JSON.parse(fs.readFileSync(path.join(here, 'cases.json'), 'utf8'));
const custom = process.argv.slice(2);
const [command, ...args] = custom.length ? custom : [process.execPath, path.join(here, 'requester.mjs')];
const STEP_TIMEOUT_MS = 10000;
const KILL_DELAY_MS = 100;

function runStep(step, dirs, store) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: {
        ...process.env,
        HITL_RESPONSE_FILE: responseFile,
        HITL_STATE_DIR: dirs.state,
        HITL_EFFECTS_FILE: dirs.effects,
        HITL_PRESENT: String(step.present),
        HITL_KILL_AT: step.killAt ?? '',
        HITL_STORE: store,
      },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), STEP_TIMEOUT_MS);
    const result = { outcomes: [], reachedKillPoint: false };
    let output = '';
    let killTimer;
    let killSent = false;
    child.stdout.on('data', (chunk) => {
      output += chunk;
      const lines = output.split(/\r?\n/);
      output = lines.pop();
      for (const line of lines) {
        if (line === `at ${step.killAt}`) {
          result.reachedKillPoint = true;
          // The short wait shows whether the process stayed alive to be killed.
          killTimer = setTimeout(() => {
            killSent = true;
            child.kill('SIGKILL');
          }, KILL_DELAY_MS);
        } else if (line.startsWith('outcome ')) {
          result.outcomes.push(line.slice('outcome '.length));
        }
      }
    });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      resolve({ ...result, exitedBeforeKill: result.reachedKillPoint && !killSent, code, signal });
    });
  });
}

function countEffects(file) {
  if (!fs.existsSync(file)) return 0;
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length;
}

async function runCase(testCase) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hitl-replay-'));
  const dirs = { state: path.join(root, 'state'), effects: path.join(root, 'effects.log') };
  fs.mkdirSync(dirs.state);
  const problems = [];
  for (const [index, step] of testCase.steps.entries()) {
    const result = await runStep(step, dirs, testCase.store ?? 'durable');
    const label = `step ${index + 1}`;
    if (step.killAt) {
      if (!result.reachedKillPoint) problems.push(`${label} never reached ${step.killAt}`);
      else if (result.exitedBeforeKill) problems.push(`${label} exited before the kill`);
    } else if (result.code !== 0) {
      problems.push(`${label} ended with ${result.signal ?? `exit code ${result.code}`}`);
    } else if (JSON.stringify(result.outcomes) !== JSON.stringify(step.expect)) {
      problems.push(`${label} reported ${JSON.stringify(result.outcomes)}, expected ${JSON.stringify(step.expect)}`);
    }
  }
  const effects = countEffects(dirs.effects);
  if (effects !== testCase.effects) problems.push(`${effects} effects, expected ${testCase.effects}`);
  fs.rmSync(root, { recursive: true, force: true });
  return { effects, problems };
}

let failed = 0;
for (const testCase of cases) {
  if (custom.length && testCase.control) continue;
  const { effects, problems } = await runCase(testCase);
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${testCase.name}: ${effects} effects`);
  for (const problem of problems) console.log(`     ${problem}`);
  if (problems.length) failed++;
}
if (failed) {
  console.error(`${failed} case(s) failed`);
  process.exit(1);
}
