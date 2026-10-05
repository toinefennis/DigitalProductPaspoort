---
name: External export boundaries
description: Why MySQL exports preserve legacy fields that the application does not represent.
---

Exports must preserve destination-only fields when the app has no source value for them. Do not invent null, zero, or empty values simply to align mismatched models.

**Why:** The external MySQL database can contain information outside this app's data model. Replacing those values during an export would lose information; error repairs are not permission to replace external data or migrate its schema.

**How to apply:** When repairing or extending exports, map fields from verified source data, omit unsupported fields from upserts, and report unconvertible values explicitly. Obtain consent before destructive destination changes.