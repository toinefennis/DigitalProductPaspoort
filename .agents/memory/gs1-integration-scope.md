---
name: GS1 integration scope
description: Product requirements and identity boundaries for the requested GS1 integration.
---

The user requires GS1 API support for retrieving and creating/assigning GTIN codes for DPPs, using all GS1 fields, and storing the code and reference in the app's own database. The intended public domain is dpp.gwcirculair.nl.

The user confirmed having GS1 codes and API access, and supplied the GS1 Nederland acceptance documentation for Digital Link V2. Specific Basic/Master Product Data API grants require separate verification.
The user subsequently clarified: "Dit is de productieomgeving API". Use the production GS1 environment for this integration; do not infer acceptance credentials from an acceptance documentation link. API subscriptions must still be checked separately.

**Why:** The documentation link was for acceptance, but the user confirmed that their API access is for production.

**How to apply:** Keep production and acceptance records and token caches separated. Never switch environments automatically after an authentication failure.

The user specified separate Basic Product Data IN API hosts: production `https://gs1nl.api.gs1.nl`, acceptance `https://gs1nl.api.acc.gs1.nl`. Keep authorization, Basic OUT, and Digital Link on their existing GS1 API hosts.

**Why:** The user supplied this exact production/sandbox host mapping for the GtinCodeRanges request; Basic IN must not force unrelated API calls onto the new host.

**How to apply:** Use the environment-matched Basic IN host for GTIN range retrieval, registration, and registration-result polling; keep credentials, environment configuration, and all other API endpoints unchanged.

**Why:** The user explicitly requested complete GS1 data support and locally linked records for the public DPP app.

**How to apply:** Preserve complete nested and multilingual GS1 data rather than flattening it into a few local fields. Distinguish GS1-licensed identifiers and confirmed external registration from internal app identifiers. Basic Product Data APIs cover basic registry data; extensive Master Product Data requires the applicable GS1 Data Source access. Never invent production endpoints or treat a locally generated code as an officially assigned GTIN.