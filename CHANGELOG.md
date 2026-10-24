# Changelog

All notable changes to the `hitl` specification are recorded here. The three messages version together, so one entry covers `hitl/request`, `hitl/response` and `hitl/event`.

## v0 (draft, October 2026)

First public draft, published for comment.

* `hitl/request/v0`: one question of at most 160 characters; answer types `binary`, `single`, `multi`, `number`, `text` and `secret`; options, bounds, `default`, `recommended`, `reasonRequired`, `deadline` and `onExpiry`; `context` with markdown, links and attachments (`mustOpen`); action binding by `argsHash`; `risk`; `requester`; encryption to the requester's key for secrets.
* `hitl/response/v0`: statuses `answered`, `declined`, `cancelled` and `expired`; the answer in `value`; `decidedBy`, `decidedAt`, `argsHash`; optional Ed25519 signature over JCS; reviewer `activity`.
* `hitl/event/v0`: required `presented`, `opened` and `decided` events; optional `bytes` and `scroll`; hash-chained.
* JSON Schema 2020-12 for all three messages, examples, test vectors and a validation workflow.
