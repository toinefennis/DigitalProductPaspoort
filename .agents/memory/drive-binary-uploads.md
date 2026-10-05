---
name: Drive binary uploads
description: Upload binary assets through the connector proxy without corrupting their content.
---

Use multipart/related with a JSON metadata part and a media part marked `Content-Transfer-Encoding: base64` when uploading binary files through the string-only Drive proxy.

**Why:** The proxy's documented request body is a string, not a binary stream. Google Drive decodes MIME base64 correctly; successful uploads were verified against local MD5 checksums and byte lengths.

**How to apply:** Read binary files within the impure upload operation, encode only the media part, and verify the returned checksum, size, and destination parent before reporting success. Preserve existing files instead of silently overwriting same-name content.