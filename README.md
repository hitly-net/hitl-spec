# hitl

`hitl` is an open specification for how a software agent asks a human for an approval or a structured answer, and how that answer comes back. It defines three messages that version together: `hitl/request/v0` (the agent's ask), `hitl/response/v0` (the human's answer) and `hitl/event/v0` (reviewer activity that forms part of the decision evidence). The aim is one portable shape that carries a single headline question, typed answers, a recommendation with its reason, reason rules, a deadline with a defined expiry outcome, binding to the exact action, and a record of what the reviewer was shown and opened before deciding.

> **Status: draft v0, comments wanted.** Field names are settled for this draft, but the shape will change once people other than the authors have had a go at it. Please leave feedback in GitHub Discussions under "v0 feedback".
