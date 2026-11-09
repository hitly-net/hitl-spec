# Changelog

All notable changes to the `hitl` specification are recorded here. The three messages version together, so one entry covers `hitl/request`, `hitl/response` and `hitl/event`.

## v0 (draft, October 2026)

First public draft, published for comment.

* `hitl/request/v0`: one question of at most 160 characters; answer types `binary`, `single`, `multi`, `number`, `text` and `secret`; options, bounds, `default`, `recommended`, `reasonRequired`, `deadline` and `onExpiry`; `context` with markdown, links and attachments (`mustOpen`); action binding by `argsHash`; `risk`; `requester`; encryption to the requester's key for secrets.
* `hitl/response/v0`: statuses `answered`, `declined`, `cancelled` and `expired`; the answer in `value`; `decidedBy`, `decidedAt`, `argsHash`; optional Ed25519 signature over JCS; reviewer `activity`.
* `hitl/event/v0`: required `presented`, `opened` and `decided` events; optional `bytes` and `scroll`; hash-chained.
* JSON Schema 2020-12 for all three messages, examples, test vectors and a validation workflow.
* A replay-after-restart conformance check for the single-use rules in section 3.8, under `examples/conformance/`.
* A non-normative reference beside that check to Salah Makboul's Call4Agents crash/resume findings (author-reported results; no change to the specification, schemas or runners).
* Section 3.2: a host SHOULD expose the original create-once request for reviewer verification (canonical payload plus content hash); no mutable display snapshot.
* Section 3.7: `mustOpen` gates acting answers; Ignore/dismiss is exempt (matches declined wording).
* Section 3.2: create-once replay is scoped to the creating API key; a host SHOULD retain records for 10 days; same key + `idempotencyKey` + `payloadHash` replays; a different `payloadHash` is `409` with code `idempotency_conflict` (no replay). Re-submits after a terminal response follow 4.2.
* Section 3.8 / 4.2: `editedArgs` appear only on the decision response and MUST NOT change the stored request.
* Section 4.2: a host `respond` decision maps to `answered`; requester cancel is scoped to the creating API key (`404` for other keys, `409` for a closed request).
* Section 4.4: callback POST shape (`Authorization: Bearer <cb_auth_token>`), optional HMAC (key id, timestamp and body), stable `event_id` for de-duplication, opt-in lifecycle events.
* Section 9: if `deadline` is absent the host SHOULD default to 24 hours; a host SHOULD refuse a deadline more than 30 days from ingest.
* Section 16: Versioning (proposed), not yet decided — unversioned `/mcp`, additive tool changes, new tool name plus about 90 days of deprecation for a break, response schema `id` carries the version.
