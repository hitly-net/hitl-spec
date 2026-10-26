# hitl v0

**Status:** draft v0, published for comment. Not stable. Field names are settled for this draft; anything may still change before v1.

**Identifiers:** `hitl/request/v0`, `hitl/response/v0`, `hitl/event/v0`

**Schemas:** [request.json](schemas/v0/request.json), [response.json](schemas/v0/response.json), [event.json](schemas/v0/event.json) (canonical `$id` values under `https://hitly.net/spec/hitl/v0/`)

## Contents

1. [Introduction](#1-introduction)
2. [Conventions](#2-conventions)
3. [Request: hitl/request/v0](#3-request-hitlrequestv0)
4. [Response: hitl/response/v0](#4-response-hitlresponsev0)
5. [Events and reviewer activity disclosure](#5-events-and-reviewer-activity-disclosure)
6. [Link redirect tracking](#6-link-redirect-tracking)
7. [Validation by both UI and host](#7-validation-by-both-ui-and-host)
8. [Secret answers](#8-secret-answers)
9. [Expiry outcome](#9-expiry-outcome)
10. [Signatures](#10-signatures)
11. [Out of scope for v0](#11-out-of-scope-for-v0)
12. [Versioning and extensions](#12-versioning-and-extensions)
13. [Mappings onto existing protocols](#13-mappings-onto-existing-protocols)
14. [Related work](#14-related-work)
15. [Open questions for v0 feedback](#15-open-questions-for-v0-feedback)

## 1. Introduction

Agents increasingly need a human to approve an action or supply a piece of information before they carry on. Each agent framework has its own way of pausing for that, and none of them describes the human-facing part end to end: one clear question, a typed answer, the agent's recommendation and its reason, when a reason is required, what happens at the deadline, which exact action is being approved, and a record of what the reviewer was shown and opened before deciding.

`hitl` defines that shape as three JSON messages:

* **`hitl/request/v0`**: the agent's ask. One question, one answer type.
* **`hitl/response/v0`**: the outcome. The human's answer in `value`, or the reason there is none, with who decided, when, the action binding and the reviewer activity.
* **`hitl/event/v0`**: one reviewer activity event. Events form a hash chain that is part of the decision evidence.

Roles used in this document:

* **Requester:** the agent (or the system acting for it) that sends a request and acts on the response.
* **Host:** the service that accepts requests, presents them to reviewers, records activity and returns responses. HITLy (https://hitly.net) is the first implementation.
* **Reviewer:** the human, or group, who answers.
* **Reviewer client:** the UI the reviewer uses. It may be served by the host or be a native client.

Each request carries exactly one question and produces at most one decision. Several questions are several requests.

## 2. Conventions

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY" and "OPTIONAL" in this document are to be interpreted as described in BCP 14 ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)) when, and only when, they appear in all capitals, as shown here.

* Messages are JSON ([RFC 8259](https://www.rfc-editor.org/rfc/rfc8259)) objects. The JSON Schemas in `schemas/v0/` use JSON Schema draft 2020-12 and are normative for structure. Where this text and a schema disagree, report it in Discussions; until resolved, this text wins.
* Timestamps are [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) date-time strings. UTC with a `Z` suffix is RECOMMENDED.
* **JCS** means the JSON Canonicalization Scheme, [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785).
* **b64url** means unpadded base64url ([RFC 4648 section 5](https://www.rfc-editor.org/rfc/rfc4648#section-5)). A SHA-256 digest in b64url is 43 characters.
* **Unknown keys.** A receiver MUST refuse a message that contains a key not defined by this specification, at the top level or nested, with a field error naming that key. Extensions go only in `_meta` (section 12).

## 3. Request: hitl/request/v0

### 3.1 Fields

| Field | Required | Description |
|---|---|---|
| `spec` | yes | The string `"hitl/request/v0"`. |
| `id` | host only | Request identifier assigned by the host. See 3.2. |
| `idempotencyKey` | no | The requester's own handle for the request. See 3.2. |
| `question` | yes | One sentence, at most 160 characters, ending with `?`. |
| `answerType` | yes | `binary`, `single`, `multi`, `number`, `text` or `secret`. |
| `options` | per type | Array of `{value, label, description?}`. REQUIRED for `binary`, `single` and `multi`; MUST NOT appear for other types. |
| `bounds` | no | Constraints on the answer, per type (3.4). |
| `default` | no | A default answer. The reviewer client decides whether to pre-select it. |
| `recommended` | no | `{value, reason}`: the requester's recommended answer and why. |
| `reasonRequired` | no | Array of answer values for which the reviewer MUST give a reason (3.6). |
| `deadline` | no | When the request expires. |
| `onExpiry` | no | Absent or `"expire"` in v0 (section 9). |
| `context` | no | `{markdown?, links?, attachments?}` (3.7). |
| `action` | no | `{name, argsHash}`: the exact action the answer authorises (3.8). |
| `risk` | no | `{level?, reversible?}`. `level` is `low`, `medium`, `high` or `critical`; `reversible` is a boolean. |
| `requester` | yes | `{agentId, runId?, onBehalfOf?}`. |
| `encryption` | per type | `{publicKey, alg}`. REQUIRED for `secret`; MUST NOT appear for other types (section 8). |
| `_meta` | no | Extensions (section 12). |

### 3.2 Identifiers

* The host assigns `id` and returns it to the requester when it accepts the request. A host MUST refuse a submitted request that already carries `id`.
* `idempotencyKey` is the requester's handle. A host SHOULD treat a repeat submission with the same `idempotencyKey` from the same requester as the same request and return the existing `id` rather than creating a second ask.
* The response carries the host's `id` as `requestId`.

### 3.3 The question

* `question` MUST be a single sentence of at most 160 characters that ends with a question mark. It is the headline the reviewer reads first, often on a phone.
* Supporting detail belongs in `context.markdown`, not in `question`.

### 3.4 Answer types, options and bounds

| `answerType` | `value` in the response | `options` | `bounds` |
|---|---|---|---|
| `binary` | `"approve"` or `"reject"` | exactly two, with values `approve` and `reject` | none |
| `single` | one option `value` (string) | REQUIRED | none |
| `multi` | array of distinct option values | REQUIRED | `{minItems?, maxItems?}` |
| `number` | number | none | `{min?, max?, step?, unit?}` |
| `text` | string | none | `{minLength?, maxLength?, pattern?}` |
| `secret` | ciphertext string (section 8) | none | none |

* Each option is `{value, label, description?}`. `value` is what comes back in the response; `label` and `description` are for display. Option values MUST be unique within a request.
* For `binary`, the option values are fixed as `"approve"` and `"reject"`. Labels are free text, so "Sign off" and "Send back" are fine.
* `bounds.pattern` for `text` MUST be an [RFC 9485](https://www.rfc-editor.org/rfc/rfc9485) I-Regexp of at most 256 characters, so that it behaves the same across languages and can run on linear-time engines.
* `step` for `number` MUST be greater than zero. `unit` is a display label such as `GBP` or `kg`.
* `text` is for ordinary answers ("What is your dog's name?"). Passwords, keys and other secrets MUST use `secret` instead.

### 3.5 Default and recommended

* `default` and `recommended` are independent. Either, both or neither may be present. Their values MUST be valid answers for the request (an option value, a number within bounds, and so on). They MUST NOT appear on `secret` requests.
* The reviewer client decides whether to pre-select `default`.
* The reviewer client SHOULD mark the `recommended` answer and show its `reason`. It SHOULD NOT pre-select the recommended answer: a pre-ticked recommendation invites rubber-stamping.
* Whether a reviewer went with the default or the recommendation is derivable by comparing request and response, so no separate field records it.

### 3.6 Required reasons

* `reasonRequired` lists answer values for which the reviewer MUST supply `reason`. Its values MUST be valid answer values for the request.
* For `binary`, when `reasonRequired` is absent it defaults to `["reject"]`.
* For `single`, the rule triggers when the chosen value is listed. For `multi`, it triggers if any selected value is listed. For `number` and `text`, it triggers on an exact match.
* `declined` responses MAY carry a reason whether or not one is required.

### 3.7 Context: markdown, links and attachments

* `context.markdown` is supporting detail. The reviewer client SHOULD show it collapsed by default under the question, so the question stays the headline.
* `context.links[]` items are `{ref, url, label, description?, mustOpen?}`. `url` MUST use `https`. The reviewer client SHOULD show the real destination domain. The host MUST NOT fetch link targets server-side.
* `context.attachments[]` items are `{ref, name, mediaType, size, sha256, url | inline, mustOpen?}`. Exactly one of `url` (https) or `inline` MUST be present. `inline` is base64 content for small files only, at most about 256 KB of content. `sha256` is the b64url SHA-256 of the file's bytes, so the evidence pins exactly what was shown.
* `ref` identifies an item. It MUST be unique across `links` and `attachments` within a request. The ref `"context"` is reserved for the markdown itself (used by `scroll` events) and MUST NOT be used for an item.
* `mustOpen: true` means the answer controls MUST stay disabled until the reviewer has opened that item. A host MUST NOT enforce `mustOpen` without recording the open as `openedAt` (section 5).

### 3.8 Action binding

* `action.name` names the operation, for example `payments.refund`.
* `action.argsHash` is `b64url(SHA-256(JCS(args)))`, where `args` is the exact argument object the requester will pass to the action.
* The host MUST copy `argsHash` into the response. Before acting, the requester MUST recompute the hash over the arguments it is about to use and MUST NOT act if it differs from the response's `argsHash`. This stops an approval from being replayed against different arguments.
* Test vectors are in [examples/vectors/args-hash.json](examples/vectors/args-hash.json).

### 3.9 Requester

* `requester.agentId` identifies the asking agent. `runId` identifies the run, and `onBehalfOf` the person or team the agent acts for, when relevant.

## 4. Response: hitl/response/v0

### 4.1 Fields

| Field | Required | Description |
|---|---|---|
| `spec` | yes | The string `"hitl/response/v0"`. |
| `requestId` | yes | The host-assigned `id` of the request. |
| `status` | yes | `answered`, `declined`, `cancelled` or `expired`. |
| `value` | when answered | The answer, typed per the request's `answerType` (3.4). Ciphertext for `secret`. |
| `reason` | per rules | The reviewer's reason. REQUIRED when `reasonRequired` triggers (3.6). |
| `decidedBy` | when answered or declined | `{kind, id, display?}`. `kind` is `human`, `group` or `service`. |
| `decidedAt` | when answered or declined | When the decision was made. |
| `argsHash` | when the request had `action` | Copied from `request.action.argsHash`. |
| `signature` | SHOULD | `{alg, kid, sig}` or `null` (section 10). |
| `activity` | yes | `{presentedAt, items[], events?}` (4.3). |
| `_meta` | no | Extensions (section 12). |

### 4.2 Status

* `answered`: the reviewer gave an answer in `value`. A binary approval is `status: "answered"` with `value: "approve"`, and a binary rejection is `status: "answered"` with `value: "reject"`. There are no separate approved or rejected statuses.
* `declined`: the reviewer chose not to answer. `value` MUST be absent.
* `cancelled`: the request was withdrawn (for example by the requester or the host) before an answer. `value` MUST be absent.
* `expired`: the deadline passed with no answer (section 9). `value`, `decidedBy` and `decidedAt` MUST be absent.
* A reviewer client MAY label the decline action Dismiss, Decline, Skip or similar. There is no separate `dismissed` status in v0: a local widget or tool payload such as `{dismissed: true}` (for example an AG-UI chat card) MUST be reported on the wire as `hitl/response/v0` with `status: "declined"` and no `value`. Do not confuse this with `cancelled`, which is an ask withdrawn by the requester or the host.
* `decidedBy` records who decided. A shared identity, such as a team board login, is valid as `kind: "group"`. A host SHOULD use `kind: "human"` with a stable per-person `id` when it knows the individual.

### 4.3 Activity

* `activity.presentedAt` is when the request was first shown to a reviewer, or `null` if it never was.
* `activity.items[]` has one entry per link and attachment: `{ref, sha256, openedAt[]}`. `sha256` is the attachment hash from the request, or `null` for links. `openedAt` lists every recorded open, in order; it is empty if the item was never opened.
* `activity.events[]` MAY carry the full `hitl/event/v0` chain (section 5).
* The host MUST return `activity` with every response, including `expired` and `cancelled`.

## 5. Events and reviewer activity disclosure

### 5.1 Event fields

| Field | Required | Description |
|---|---|---|
| `spec` | yes | The string `"hitl/event/v0"`. |
| `id` | yes | Event identifier, unique within the host. |
| `requestId` | yes | The request the event belongs to. |
| `type` | yes | `presented`, `opened`, `decided`, `bytes` or `scroll`. |
| `itemRef` | per type | REQUIRED for `opened`, `bytes` and `scroll`. An item `ref`, or `"context"` for the markdown (scroll only). |
| `at` | yes | When the event happened. |
| `actor` | yes | `{kind, id}`, with `kind` as in `decidedBy`. |
| `source` | yes | `host` (measured by the host) or `client` (reported by the reviewer client). |
| `data` | per type | Type-specific data (5.3). Absent for required types. |
| `prevHash` | yes | `hash` of the previous event for the same request, or `null` for the first. |
| `hash` | yes | This event's hash (5.4). |

### 5.2 Required events

A host MUST record:

* `presented`: when the request is first shown to a reviewer. This sets `activity.presentedAt`.
* `opened`: each time a reviewer opens a link or attachment, per item. These populate `activity.items[].openedAt`.
* `decided`: when the reviewer submits an answer or declines. This matches `decidedAt` and `decidedBy`.

`presented` and `decided` have `source: "host"`.

### 5.3 Optional events

A host MAY support the following, and MUST declare which it supports:

* `bytes`: `data: {bytesServed, bytesTotal}`, `source: "host"`. Only for documents served from the host's own file store. External links are redirected, so the host has no byte visibility and MUST NOT emit `bytes` for them.
* `scroll`: `data: {maxFraction, reachedEnd}` where `maxFraction` is between 0 and 1, `source: "client"`. `itemRef` is an item ref or `"context"` for the markdown. Scroll is self-reported by the client and is not proof of reading.

Nothing else is tracked in v0: no reading time, keystrokes, screen capture or similar. Device or channel details appear only where an evidence format explicitly defines them.

### 5.4 Hash chain

* Events for a request form a chain in the order recorded. The first event has `prevHash: null`; each later event's `prevHash` is the previous event's `hash`.
* `hash` is `b64url(SHA-256(JCS(event)))`, computed over the event with the `hash` member removed.
* The chain is part of the decision evidence. A worked example is in [examples/vectors/event-chain.json](examples/vectors/event-chain.json).

### 5.5 "Opened", never "read"

A host can show that a reviewer opened an item. It cannot show that they read it. A host and its reviewer clients MUST NOT describe any event or field as "read"; they say "opened".

### 5.6 Disclosure to reviewers

* A host MUST tell reviewers that these events are logged, for example in a privacy notice and a hint in the inbox. If optional events are enabled, reviewers MUST be told that too.
* Exact wording is for each host to settle with its own legal advice.
* Retention of events follows the host's evidence retention policy.

## 6. Link redirect tracking

To record `openedAt` for links without exposing an open redirect, a host that tracks opens through its own server MUST follow these rules:

* Each link is presented to each reviewer as an opaque URL of the form `/o/<token>` on the host.
* The token MUST be bound to the request, the item and the reviewer. It MUST NOT carry the target URL as a parameter. The host redirects only to the URL stored in the request.
* Opens count only from an authenticated reviewer session. Without a session the host asks the reviewer to sign in first.
* The host MUST ignore `HEAD` requests for counting, so mail scanners and chat link previews do not register as opens.
* On `GET`, the host records an `opened` event (every open, not only the first) and then responds `303 See Other` to the target with `Referrer-Policy: no-referrer`.
* The host never fetches the target itself.

A host MAY instead record opens through a client-side event, subject to the same disclosure rules.

## 7. Validation by both UI and host

Both sides validate. Neither replaces the other.

**At request ingest**

* The host MUST validate each request against the schema and the rules in section 3, including those a schema cannot express: option values unique, `default`, `recommended.value` and `reasonRequired` entries valid for the request, `ref` values unique, bounds consistent (for example `min` not greater than `max`).
* The host MUST refuse a malformed request with per-field errors that identify each failing field (for example by JSON Pointer) and give a hint on how to fix it. It MUST NOT silently drop unknown or invalid fields.

**At answer submission**

* The reviewer client MUST validate the answer against the request's rules before submitting and MUST handle a refused submission gracefully, keeping the reviewer's input.
* The host MUST validate the submitted answer again against the same rules (type, options, bounds, pattern, required reason, `mustOpen`). It MUST refuse an invalid answer with field errors. It MUST NOT alter, trim, coerce or otherwise change the value.

## 8. Secret answers

* A `secret` request MUST carry `encryption: {publicKey, alg}`. The public key comes from the requester. `publicKey` is b64url.
* The reviewer client MUST encrypt the answer to that key before submission. The host stores and forwards only the ciphertext, which is returned as `value`.
* The public key is part of the request and so is covered by the request's evidence, which means a host cannot swap it unnoticed.
* Secret requests carry no `options`, `bounds`, `default`, `recommended` or `reasonRequired`.
* The host cannot validate a secret's content. It still validates the request and the shape of the submission.
* **Known limit.** When the reviewer client is a web UI served by the host, the host serves the code that does the encryption. A malicious or compromised host could serve code that leaks the plaintext. Native or independently distributed clients close this gap; a host-served browser UI cannot fully close it. Requesters SHOULD take this into account when deciding what to ask for as a secret.
* Which algorithm to pin is an open question (section 15). The example uses `HPKE-X25519-SHA256-AES128GCM` as an illustration only.

## 9. Expiry outcome

* Expiry is its own outcome. When `deadline` passes with no answer, the host MUST close the request with `status: "expired"` and tell the requester.
* A host MUST NOT auto-approve, auto-reject or otherwise auto-answer on expiry. A timeout that silently approves is a policy bypass with a clock on it.
* `onExpiry` MUST be absent or `"expire"` in v0. Other values are reserved for later versions, and a host MUST refuse them.
* An expired response still carries `activity`, so the requester can see whether the ask was ever presented.

## 10. Signatures

* A response signature is `{alg: "Ed25519", kid, sig}`. `sig` is the b64url Ed25519 ([RFC 8032](https://www.rfc-editor.org/rfc/rfc8032)) signature over the JCS form of the response with the `signature` member removed. `kid` names the signing key.
* A host publishes its verification keys as a JWKS ([RFC 7517](https://www.rfc-editor.org/rfc/rfc7517)) at `https://<host>/.well-known/hitl-keys.json`.
* In v0 a host SHOULD sign every response; `signature` MAY be `null`. In v1 signing will be REQUIRED.
* A requester that receives a signed response SHOULD verify it before acting. The example responses are signed with a test key published in [examples/keys/hitl-keys.json](examples/keys/hitl-keys.json).

## 11. Out of scope for v0

* **Multiple approvers and quorum.** v0 is one request, one decision, by one reviewer (which may be a group identity). Multi-approver flows, quorum, four-eyes, delegation and escalation are planned for v1.
* Rendering details beyond the SHOULDs above. Hosts choose their own UI.
* Transport. `hitl` defines message shapes, not an API. Section 13 shows how to carry them in existing protocols.

## 12. Versioning and extensions

* The three messages form one family and version together: `hitl/request/vN`, `hitl/response/vN` and `hitl/event/vN` always share `N`.
* v0 is a draft and may change in incompatible ways. The family moves to v1 when it is published as stable.
* Canonical schemas live at `https://hitly.net/spec/hitl/v0/request.json`, `response.json` and `event.json`. This repository is their source.
* **Extensions.** Additional data goes only in a `_meta` object, under reverse-DNS keys, for example `net.hitly/trace`. Receivers that do not understand a `_meta` key MUST ignore it.
* When `hitl` data is carried inside another protocol's `_meta` or metadata object, keys use the `net.hitly/...` prefix, for example `net.hitly/hitl-request`.

## 13. Mappings onto existing protocols

These mappings are informative.

### 13.1 MCP elicitation

[MCP elicitation](https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation) is the closest existing base: a message, a restricted JSON Schema for the answer, accept, decline and cancel, and clients that already render it.

* `question` becomes the elicitation `message`.
* `answerType`, `options` and `bounds` become a `requestedSchema` with a `value` property and a `reason` string property:
  * `binary` and `single`: string enum of the option values, with labels as titles;
  * `multi`: array of the enum, with `minItems` and `maxItems`;
  * `number`: number with `minimum` and `maximum`;
  * `text`: string with `minLength`, `maxLength` and `pattern`.
* `default` may map to the schema's `default`; `recommended` should not, so that it is highlighted rather than pre-selected.
* The full request rides in `_meta` under `net.hitly/hitl-request`.
* MCP `accept` with content maps to `answered` (including a binary reject); `decline` maps to `declined`; `cancel` maps to `cancelled`. Conditional required reasons and `mustOpen` are enforced by the host, since the restricted schema cannot express them.

### 13.2 AG-UI interrupts

* A request maps to an interrupt with the question as its message, a response schema derived as for MCP, `expiresAt` from `deadline`, and the request in metadata under `net.hitly/hitl-request`. When the request is bound to a tool call, the interrupt carries that `toolCallId`.
* The resume entry carries `{value, reason}` as its payload and `decidedBy` and `signature` in metadata.
* A resume that dismisses the interrupt without an answer, for example `{dismissed: true}`, maps to `declined`, not `cancelled`.

### 13.3 A2A input-required

* The task moves to the input-required state. The status message carries the question as a text part and the full request as a data part, under an extension URI that the agent declares in its Agent Card.
* The answer comes back as a follow-up message on the same task with the `hitl/response/v0` object as a data part.

## 14. Related work

* **MCP elicitation** provides the message, restricted schema and accept, decline and cancel outcomes that `hitl` maps onto (13.1). **MCP SEP-2848** (async approval for tool calls) covers the plumbing for calls that are denied but approvable; `hitl` could be its human-facing shape.
* **OpenID AuthZEN Access Request and Approval Profile** binds approvals to arguments with a hash over RFC 8785 canonical JSON, with expiry and idempotency, and leaves the reviewer inbox out of scope. `hitl` uses the same hashing and aims to be that reviewer-facing layer.
* **AG-UI interrupts** and **A2A input-required** give an ask somewhere to live in a run or a task; `hitl` supplies its content (13.2, 13.3).
* **Twilio A2H** has collect and authorise intents with signed approve and decline, but no recommendation or required reasons.
* **Agent frameworks** (Mastra suspend and resume, LangGraph interrupts, the OpenAI Agents SDK and Vercel AI SDK tool approvals, Microsoft Agent Framework, Google ADK, HumanLayer) each pause in their own way, mostly approve or reject on a tool call. None carries a headline question, a recommendation with a reason, required reasons, a defined expiry outcome and reviewer evidence together.
* **Older work** such as WS-HumanTask and BPMN user tasks, OAuth CIBA, RFC 9396 (Rich Authorization Requests), Adaptive Cards and Slack Block Kit cover parts of this space (deadlines and escalation, back-channel approval, typed inputs) for other settings.

## 15. Open questions for v0 feedback

Please discuss these in GitHub Discussions under "v0 feedback".

1. **Encryption algorithm for secret answers.** Which `alg` should v0 pin for `secret` answers (for example an HPKE suite, or JWE), and with it the exact ciphertext encoding returned in `value`?
2. **Quorum and multi-approver for v1.** What should multiple approvers, quorum, four-eyes, delegation and escalation look like in v1, and what do regulated approvals need?
3. **MCP `_meta` versus a SEP.** Should `hitl` stay a mapping onto MCP elicitation through `_meta` keys, or be proposed to MCP as a SEP (for example as the human-facing shape for SEP-2848)?
