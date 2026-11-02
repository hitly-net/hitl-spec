# Replay after restart

A conformance check for the single-use rules in [SPEC.md section 3.8](../../../SPEC.md#38-action-binding). A requester that follows the wire format can still honour one response twice if it forgets the use when it restarts.

```
node examples/conformance/replay-after-restart/run.mjs
```

It needs Node 20 or later and no packages.

## What it checks

| Case | What happens | Must end with |
|---|---|---|
| Replay in the same process | Act, then present the same response again | Refused, 1 effect |
| Replay after a restart | Act, restart, present it again | Refused, 1 effect |
| Kill after the record, before the action | Kill, restart, present it again | Outcome unknown, 0 effects |
| Kill after the action | Kill, restart, present it again | Outcome unknown, 1 effect |
| Control: a used set kept only in memory | Act, restart, present it again | Acted again, 2 effects |

The control breaks the rule on purpose. The run fails if the control stops producing 2 effects, because a check that cannot fail proves nothing.

Two things matter in how it works:

* The kill is a real SIGKILL from another process. An exception would run cleanup code that a crash never runs.
* Effects are counted in a separate file that stands for the outside system, not in the requester's own record.

## Testing your own requester

Pass your command to the runner. The control is skipped, because it only applies to the reference requester.

```
node run.mjs python my_agent.py
```

The runner sets these environment variables:

| Variable | Meaning |
|---|---|
| `HITL_RESPONSE_FILE` | The response to act on |
| `HITL_STATE_DIR` | An empty directory for your durable record, kept across the restarts in one case |
| `HITL_EFFECTS_FILE` | Perform the action by appending one line here |
| `HITL_PRESENT` | How many times to present the response in this process |
| `HITL_KILL_AT` | `afterRecord`, `afterEffect` or empty |

Print `outcome acted`, `outcome refused` or `outcome unknown` once for each presentation. At the point named in `HITL_KILL_AT`, print `at afterRecord` or `at afterEffect` and wait to be killed.

A requester that commits the use record and the effect in one transaction has no point between the two, so the two kill cases don't apply to it.

## Limits

* It kills processes. It does not test power loss or a storage failure.
* It does not test a kill in the middle of the action, or an action that fails.
* It tests the requester only, not a host's create-once retention from section 3.2.
