---
name: GS1 integration scope
description: Product requirements and identity boundaries for the requested GS1 integration.
---

The user requires GS1 API support for retrieving and creating/assigning GTIN codes for DPPs, using all GS1 fields, and storing the code and reference in the app's own database. The intended public domain is dpp.gwcirculair.nl.

The user confirmed having GS1 codes and API access, and supplied the GS1 Nederland acceptance documentation for Digital Link V2. Specific Basic/Master Product Data API grants require separate verification.
The user identifies the codes in a supplied workbook as already registered at GS1.

**Why:** Existing GS1 identifiers must not be mistaken for new-code assignments.

**How to apply:** Treat these as existing identifiers for read-only lookup or import; do not submit them as new Basic IN auto-assignment requests.

The separate sandbox credentials authenticate successfully, but sandbox `GET /basic-product-data-in/GtinCodeRanges` returns HTTP 403. GS1's operation docs specify 404 when no ranges are assigned and 401 for an invalid token; they do not list 403.

**Why:** The 403 is an undocumented access denial, not evidence that the account simply has no GTIN ranges.

**How to apply:** Ask GS1 to clarify the sandbox account's permission for this operation. Do not treat 403 as an empty range response or attempt writes without a successful range read.

The user subsequently clarified: "Dit is de productieomgeving API". Use the production GS1 environment for this integration; do not infer acceptance credentials from an acceptance documentation link. API subscriptions must still be checked separately.

**Why:** The documentation link was for acceptance, but the user confirmed that their API access is for production.

**How to apply:** Keep production and acceptance records and token caches separated. Never switch environments automatically after an authentication failure.

The user now wants to test in the GS1 sandbox first. Keep production pointed at `https://gs1nl-api.gs1.nl` and acceptance pointed at `https://gs1nl-api-acc.gs1.nl`, using separate credentials.

**Why:** The previous production credentials failed authentication against the sandbox. The user says they have a new sandbox secret and wants sandbox testing before proceeding with production.

**How to apply:** Never overwrite production credentials with sandbox credentials. Keep acceptance traffic on the sandbox host for testing; get explicit confirmation before switching acceptance traffic back to production.

Validate exact GS1 hostnames before changing endpoints: dotted and hyphenated names are not interchangeable, and removing `acc` alone does not prove a production address is valid.

**Why:** The proposed dotted sandbox hosts `gs1nl.api.acc.gs1.nl` and `gs1nl-api.acc.gs1.nl` returned DNS `ENOTFOUND`. `gs1nl-api-acc.gs1.nl` resolves and sandbox authentication succeeds, but Basic IN range access returns HTTP 403.

**How to apply:** Verify DNS, authentication, and API entitlement separately. Ask before substituting a different hostname, and obtain a valid account-owned GTIN range before any registration attempt.

**Why:** The user explicitly requested complete GS1 data support and locally linked records for the public DPP app.

**How to apply:** Preserve complete nested and multilingual GS1 data rather than flattening it into a few local fields. Distinguish GS1-licensed identifiers and confirmed external registration from internal app identifiers. Basic Product Data APIs cover basic registry data; extensive Master Product Data requires the applicable GS1 Data Source access. Never invent production endpoints or treat a locally generated code as an officially assigned GTIN.