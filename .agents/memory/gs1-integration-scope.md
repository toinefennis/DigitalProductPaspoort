---
name: GS1 integration scope
description: Product requirements and identity boundaries for the requested GS1 integration.
---

The user requires GS1 API support for retrieving and creating/assigning GTIN codes for DPPs, using all GS1 fields, and storing the code and reference in the app's own database. The intended public domain is dpp.gwcirculair.nl.

The user confirmed having GS1 codes and API access, and supplied the GS1 Nederland acceptance documentation for Digital Link V2. Specific Basic/Master Product Data API grants require separate verification.
The user subsequently clarified: "Dit is de productieomgeving API". Use the production GS1 environment for this integration; do not infer acceptance credentials from an acceptance documentation link. API subscriptions must still be checked separately.

**Why:** The documentation link was for acceptance, but the user confirmed that their API access is for production.

**How to apply:** Keep production and acceptance records and token caches separated. Never switch environments automatically after an authentication failure.

The user explicitly chose to route every GS1 API call made in the `acceptance` configuration—including authorization and write operations—to `https://gs1nl.api.gs1.nl`. This makes acceptance-configured registration calls reach production and potentially assign real GTINs.

**Why:** The user confirmed this full scope after being told that acceptance-mode writes would target production and could create real GTIN assignments.

**How to apply:** Do not restore acceptance-specific GS1 hosts or redirect acceptance traffic without asking the user; don't infer that an acceptance label means sandbox writes.

Validate exact GS1 hostnames before changing endpoints: dotted and hyphenated names are not interchangeable, and removing `acc` alone does not prove a production address is valid.

**Why:** A user-supplied dotted hostname did not exist in public DNS, while the hyphenated production hostname authenticated successfully. Reachability and Basic IN permissions are separate checks.

**How to apply:** Verify DNS and authorization separately. Ask before substituting a different hostname, and obtain a valid account-owned GTIN range before any registration attempt.

**Why:** The user explicitly requested complete GS1 data support and locally linked records for the public DPP app.

**How to apply:** Preserve complete nested and multilingual GS1 data rather than flattening it into a few local fields. Distinguish GS1-licensed identifiers and confirmed external registration from internal app identifiers. Basic Product Data APIs cover basic registry data; extensive Master Product Data requires the applicable GS1 Data Source access. Never invent production endpoints or treat a locally generated code as an officially assigned GTIN.