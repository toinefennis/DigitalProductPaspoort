---
name: Preview isolation
description: Boundaries between responsive design fixtures and verification of the real app.
---

Keep isolated preview tooling self-contained and validate the primary application separately. A rendered design fixture is not proof that the primary runtime or authenticated pages work.

**Why:** The separate preview server could launch while the main app's dependency installation was incomplete. Anonymous browser captures also did not cover real signed-in dashboard data.

**How to apply:** Check both applications independently after dependency or sandbox setup changes. Use copied source and explicit fixtures for visual comparisons, and clearly distinguish those checks from verification of real authenticated screens.
