# hitl

`hitl` is an open specification for how a software agent asks a human for an approval or a structured answer, and how that answer comes back. It defines three messages that version together: `hitl/request/v0` (the agent's ask), `hitl/response/v0` (the human's answer) and `hitl/event/v0` (reviewer activity that forms part of the decision evidence). The aim is one portable shape that carries a single headline question, typed answers, a recommendation with its reason, reason rules, a deadline with a defined expiry outcome, binding to the exact action, and a record of what the reviewer was shown and opened before deciding.

> **Status: draft v0, comments wanted.** Field names are settled for this draft, but the shape will change once people other than the authors have had a go at it. Please leave feedback in GitHub Discussions under "v0 feedback".

## What is here

* [SPEC.md](SPEC.md): the v0 specification.
* [schemas/v0/](schemas/v0/): JSON Schema 2020-12 for each message.
  * [request.json](schemas/v0/request.json) (`$id` https://hitly.net/spec/hitl/v0/request.json)
  * [response.json](schemas/v0/response.json) (`$id` https://hitly.net/spec/hitl/v0/response.json)
  * [event.json](schemas/v0/event.json) (`$id` https://hitly.net/spec/hitl/v0/event.json)
* [examples/](examples/): valid example messages, plus test vectors for action hashes, the event hash chain and response signatures.
  * [requests/](examples/requests/): binary, single, multi, number, text, secret, and a request with links and attachments.
  * [responses/](examples/responses/): an answered and an expired response.
  * [events/](examples/events/): an optional scroll event.
  * [vectors/](examples/vectors/) and [keys/](examples/keys/): hash and signature test data.
* [tests/invalid/](tests/invalid/): messages that must be refused.

## A request at a glance

```json
{
  "spec": "hitl/request/v0",
  "question": "Issue a £240 refund for order 48213?",
  "answerType": "binary",
  "options": [
    { "value": "approve", "label": "Approve refund" },
    { "value": "reject", "label": "Reject" }
  ],
  "recommended": { "value": "approve", "reason": "Courier confirmed the parcel lost." },
  "reasonRequired": ["reject"],
  "deadline": "2026-10-26T17:00:00Z",
  "requester": { "agentId": "agent_support_01" }
}
```

The answer comes back in a `hitl/response/v0` with `status: "answered"` and `value: "approve"` or `"reject"`.

## Validating

```sh
npm ci
npm run validate
```

This checks every example against its schema, checks that every file in `tests/invalid/` is refused, and recomputes the hash and signature test vectors. The same check runs in GitHub Actions on every pull request.

## Implementations

HITLy (https://hitly.net) is the first implementation.

## Feedback and contributing

Feedback goes in GitHub Discussions under "v0 feedback". Proposed changes go through pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md) and [CHANGELOG.md](CHANGELOG.md).

## Licence

Apache License 2.0. See [LICENSE](LICENSE).
