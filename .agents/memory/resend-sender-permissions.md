---
name: Resend sender permissions
description: Distinguish send-only Resend permissions from broken authentication when configuring recovery email.
---

The authorized Resend connection has a restricted, send-only API key. Domain-list requests can return HTTP 401 with `restricted_api_key` even though sending is authorized.

**Why:** Domain discovery was denied during password-recovery setup; this is a permission boundary, not evidence that authorization expired.

**How to apply:** Do not automatically reconnect or request broader credentials for this response. Obtain a verified sender address from the operator using the non-secret environment-variable form. Do not assume the demo Resend sender can deliver to arbitrary account addresses. Do not send test emails without authorization.

The operator reports adding gwcirculair.nl to Resend domains and authorizes using its support mailbox for recovery emails.

**Why:** This is the operator-approved sending domain; adding it is not proof that Resend has completed DNS verification.

**How to apply:** Use the configured sender, but distinguish valid app configuration from verified domain status and successful delivery. Do not claim delivery was tested without actually sending an authorized email.
