---
name: Verification environment
description: Browser runtime, embedded-preview privacy, provider-output contracts and dependency-audit pitfalls.
---

Prove a browser can launch before running a metered provider journey. Downloads alone are insufficient on Replit's Nix environment.

**Why:** Downloaded Chromium failed for missing shared libraries; native Nix Chromium launched. The specialized testing worker was unavailable in this runtime, so native interactions were used instead of screenshot-only verification.

**How to apply:** Discover the installed executable rather than guessing a Nix profile/store path. Keep browser downloads and outputs ignored. Test the public development URL for proxy behavior; loopback capture is not equivalent for websockets.

Audit reachable installed dependencies, not all cached package directories. Check absent binaries against the parent's optional dependencies.

**Why:** Cache directories retained an unused transformer after a dependency change. Dependency-tree output reported other operating systems' binaries under ordinary dependencies, despite their not being installed.

**How to apply:** Distinguish an orphan cache copy from a live dependency and an optional platform from a broken required package. Never silently skip an unknown license or missing required package.

Test the embedded preview under third-party-cookie blocking; a top-level browser pass is not sufficient. Cookie availability and browser progress storage are independent checks.

**Why:** A learner's embedded search was accepted but immediately became inaccessible because the browser discarded its owner cookie. Native Chromium's stricter privacy setting also denied local storage even after partitioned cookies restored ownership.

**How to apply:** Verify session continuity before metered work, test both top-level and cross-site embedded journeys, and disclose storage loss separately. Never promise that opening a new tab transfers answers from a storage-blocked session.

Treat a provider's strict-output promise as insufficient evidence of a valid result.

**Why:** Native Groq GPT-OSS requests using strict structured output returned complete JSON with an invalid enum and HTTP 400. Official documentation described stronger guarantees than those observed responses.

**How to apply:** Validate outputs locally and distinguish model-shape failures from TinyFish reading failures or the overall deadline. Inspect the actual serialized request schema when logs contradict an intended change. Log only bounded structural diagnostics and whitelisted schema paths, never failed-generation text or personal answers.

Distinguish a documented interface from one actually available in a restricted task runtime.

**Why:** A deployment callback described in a skill was not registered, and generated artifact metadata rejected direct edits. Neither observation proves the platform feature is unsupported.

**How to apply:** Follow the authorized metadata replacement flow when available; do not guess callback names or bypass protected files with shell writes. Preserve a clearly labelled candidate and disclose unresolved configuration rather than claiming a production repair.

Playwright video recording needs its own ffmpeg build; on Nix, symlink the system ffmpeg (has libvpx) into the ms-playwright ffmpeg-<rev>/ffmpeg-linux path instead of downloading.

**Why:** recordVideo failed with "Executable doesn't exist"; the downloaded binaries hit missing shared libraries before.

**How to apply:** Demo footage is recorded by the repo's record/edit demo scripts into ignored generated-artifacts/. The taste test's track lean turns Company off in preferences — re-enable both tracks before a search meant to show grouped roadmaps.
