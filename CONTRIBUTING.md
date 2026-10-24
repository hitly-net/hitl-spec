# Contributing to hitl

Thank you for taking the time to look at `hitl`. v0 is a draft and is meant to be pulled apart.

## Feedback

* Start in GitHub Discussions, in the **v0 feedback** category. Questions, objections, use cases and "this would not work for us because..." are all welcome.
* The open questions listed in [SPEC.md section 15](SPEC.md#15-open-questions-for-v0-feedback) are a good place to start.
* Please do not post credentials, personal data or details of security weaknesses in a live system in Discussions.

## Changes

* Changes to the specification, schemas or examples go through pull requests.
* For anything beyond a typo, open or link a discussion first so the change has context.
* Keep `SPEC.md`, the schemas in `schemas/v0/` and the examples in step. A change to a field usually touches all three.
* Add or update an example for any new behaviour, and a file in `tests/invalid/` for anything that must now be refused.
* Run `npm ci` and `npm run validate` before opening a pull request. The same check runs in CI.
* Record user-visible changes in `CHANGELOG.md`.

## Style

* British English.
* Use RFC 2119 key words (MUST, SHOULD, MAY) only for real requirements.
* Use `example.com` for every URL in examples.
* The specification name is lowercase `hitl`.

## Licence

By contributing you agree that your contributions are licensed under the Apache License 2.0.
