# AIC governance linkage

## Implemented from the supplied documentation

The AIC Assistant now includes a document-linked, human-controlled bridge to the official AIC custom GPT. It applies the supplied teaching and learning rules, packages only academic sources explicitly selected by the learner, copies a reviewable coaching brief, and opens the official AIC link in ChatGPT.

This is a manual, consent-based handoff. It is deliberately labelled **Document-linked / No API connection** because the supplied PDF contains a ChatGPT custom-GPT link and usage guidance, but no AIC API endpoint, authentication method, webhook, schema or authorization for machine-to-machine access.

The implemented governance baseline is:

- guided reasoning and structure rather than replacement authorship;
- human-written final academic work and retained intellectual ownership;
- philosophical and methodological alignment checks;
- source discipline with no fabricated citations;
- independent human verification before submission; and
- exclusion of professional work data from the AIC handoff.

Official OpenAI documentation describes the inverse automated route: an authorized custom-GPT owner can configure a GPT Action so that the GPT calls a third-party REST API. Automating AIC access from this dashboard still requires the AIC custodian to authorize and configure an integration route.

The application must not claim a live Academic Intelligence Center connection until the AIC custodian authorizes and verifies it.

## Required from the AIC custodian

Provide one approved integration route:

1. **AIC-owned API** — endpoint, authentication method, request/response contract, governance version, data-handling rules and test environment; or
2. **Authorized OpenAI application package** — approved governance instructions, knowledge documents/vector-store ownership, permitted model/tool configuration, attribution language, change-control process and API credentials held outside the repository.

Also provide:

- Written authorization or a verifiable authorization reference.
- Exact naming and attribution approved for the interface.
- Rules for teaching, assessment, feedback, source citation and prohibited actions.
- Data classification, retention, residency and cross-border-transfer requirements.
- A named human escalation/approval contact.
- Test cases that distinguish compliant from non-compliant teaching behaviour.

## Connection acceptance criteria

- The application reports the exact governance version and connection status.
- Every governed teaching response identifies its source/provenance class.
- Professional data is excluded unless explicitly authorized.
- AIC failure falls back safely and never silently impersonates AIC.
- Important interactions record timestamp, operation, provider, retrieved sources and result status, but not hidden chain-of-thought.
- Human authority remains explicit; the system does not claim intellectual authorship for the learner.

The current values in `.env.example` are placeholders only. They do not establish an operational connection, endorsement, certificate, ledger entry or policy enforcement.
