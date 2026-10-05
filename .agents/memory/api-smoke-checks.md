---
name: API smoke checks
description: Avoid false positives when verifying API endpoints in this SPA.
---

For successful API smoke checks, verify the response content type and expected JSON shape, not only the HTTP status.

**Why:** Missing API endpoints can reach the SPA fallback and return HTML with HTTP 200. Status-only checks can therefore incorrectly mark a broken endpoint as working.

**How to apply:** Check JSON responses for API reads and mutations, plus explicit authentication and ownership failures. Keep any mocked sessions strictly inside isolated test servers, never as a production or Preview bypass.