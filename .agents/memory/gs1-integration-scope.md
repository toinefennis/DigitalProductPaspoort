---
name: GS1 integration scope
description: Product requirements and identity boundaries for the requested GS1 integration.
---

The user requires GS1 API support for retrieving and creating/assigning GTIN codes for DPPs, using all GS1 fields, and storing the code and reference in the app's own database. The intended public domain is dpp.gwcirculair.nl.

**Why:** The user explicitly requested complete GS1 data support and locally linked records for the public DPP app.

**How to apply:** Preserve complete nested and multilingual GS1 data rather than flattening it into a few local fields. Distinguish GS1-licensed identifiers and confirmed external registration from internal app identifiers. Basic Product Data APIs cover basic registry data; extensive Master Product Data requires the applicable GS1 Data Source access. Never invent production endpoints or treat a locally generated code as an officially assigned GTIN.