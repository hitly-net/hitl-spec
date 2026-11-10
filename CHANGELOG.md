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
* Section 3.2: create-once replay is scoped to the creating API key. Same key + `idempotencyKey` + `payloadHash` replays the existing request whatever its state; a deliberate re-submit uses a new `idempotencyKey` and gets a new `requestId`. `payloadHash` is over the ingested, normalised envelope (`action`, `allowedActions`, `contextMarkdown`, `origin` including `runId`, `resumeSchema`; not `deadline`, `_meta` or `reason`). Ten-day retention is a **provisional default (current behaviour, not yet confirmed)** / NOT YET DECIDED. `409` / `idempotency_conflict` on payload mismatch is **pending implementation**.
* Section 3.8 / 4.2: `editedArgs` appear only on the decision response and MUST NOT change the stored request.
* Section 4.2: mapping `respond` onto `answered` with the reply in `value` is a **provisional default (current behaviour, not yet confirmed)** / NOT YET DECIDED (no MUST). Requester cancel is scoped to the creating API key (`404` for other keys, `409` for a closed request).
* Section 4.1 / 4.2: the reviewer's typed ask_user answer is a core top-level `answer` field on the decision response (`{kind, value}` plus any extra keys the reviewer's client sent, returned verbatim including unicode, line breaks and an empty answer), present exactly when the host holds a typed answer and absent otherwise. It is not carried under `_meta`, and `respond` does not also copy it into `value`: `answer` is the single source of the typed answer.
* Section 4.4: optional HMAC over `timestamp + "." + raw body`; key id MAY be a header for secret selection and is not in the MAC; a verifier MUST reject an unknown key id. Bearer `cb_auth_token`, stable `event_id` and opt-in lifecycle events are **pending implementation**.
* Section 9: a 24-hour default currently applies on the MCP path only (HTTP ingest uses the project SLA). A 30-day maximum and refusal of a deadline in the past are **proposed**.
* Section 16: Versioning (proposed), not yet decided — unversioned `/mcp`, additive tool changes, new tool name plus about 90 days of deprecation for a break, response schema `id` carries the version.
* Section 4.1 / 4.2 (ruling on the `respond` mapping, supersedes the 4.2 entry above): for `status: "answered"` with a typed answer, `answer` is the only carrier and top-level `value` MUST NOT be present; respond sets `answer`, not `value`, so the earlier NOT YET DECIDED provisional default is decided and the empty `value: ""` placeholder is refused. `answer` is allowed only on `status: "answered"` and `answer.value` is a non-null string. `_meta["net.hitly/answer"]` stays a deprecated HITLy vendor alias: where emitted it MUST equal `answer` and hosts and clients SHOULD NOT rely on it.
