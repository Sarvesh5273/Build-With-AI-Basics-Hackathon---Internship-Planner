---
name: GitHub publication permissions
description: Creation versus push authority, the workspace Git-write guard, and managed transport URL rewrites.
---

A working GitHub App connection does not establish repository-creation permission. Treat a creation-specific HTTP 403 as a capability issue, not automatically an expired login.

**Why:** A healthy connection could read the account and list repositories, but both GraphQL `createRepository` and REST `POST /user/repos` returned “Resource not accessible by integration.” The REST response identified `administration=write` or `repository_creation=write` as the required permission alternatives.

**How to apply:** Check the endpoint's required permissions before repeating creation attempts or reconnecting. Reauthorization helps only when the missing permission can actually be granted. An account owner can instead create an empty repository manually; then verify push access separately, since repository creation and contents access are different permissions. Never infer that a failed creation request created a repository.

## Workspace Git-write guard

The workspace can reject ordinary Git operations that write to its Git directory even when the user has authorized committing and pushing.

**Why:** The workspace guard rejected an authorized publication command with a message naming `.git/index.lock` and requiring `DANGEROUSLY_ALLOW_GIT=1`. This is a write-policy check, not evidence of a stale lock or repository corruption.

**How to apply:** When that specific guard requests its opt-in, prefix only the needed, already-authorized Git commands with `DANGEROUSLY_ALLOW_GIT=1`. Read-only inspection can use Git's `--no-optional-locks` option. Do not delete lock files, rewrite history, or treat the flag as permission for destructive operations.

## Managed Git URL rewrites

Verify the user-approved destination against the raw `remote.origin.url`, not only the output of `git remote get-url`, which expands configured URL rewrites.

**Why:** The workspace's existing GitHub transport mapping substitutes an internal Replit proxy while preserving the owner and repository path. An exact comparison of the expanded URL with the public GitHub URL therefore rejected a correctly configured destination.

**How to apply:** Check the raw remote URL and inspect any relevant `url.*.insteadOf` mapping. Verify HTTPS, the expected repository path, and the absence of embedded credentials or unexpected query parameters. Keep the workspace's managed transport and use normal Git push rather than disabling the proxy mapping or manually injecting credentials.
