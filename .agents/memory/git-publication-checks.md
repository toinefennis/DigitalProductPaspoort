---
name: Git publication checks
description: Distinguishing Git-pane publication from shell authentication and tag publication.
---

Verify publication using remote branch and tag references separately, rather than treating a shell authentication failure as proof that no publication occurred.

**Why:** In this workspace, after the user was directed to push through the Git pane, the remote main branch matched the prepared release commit while shell push authentication still failed. The release tag remained local.

**How to apply:** Compare remote branch references with the intended release commit and check the tag explicitly. Report code synchronization, tag publication, and shell authentication as separate outcomes. Do not replace Git-provider authentication with a generic GitHub integration or request credentials in chat.
