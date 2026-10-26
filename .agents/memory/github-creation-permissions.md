---
name: GitHub repository-creation permissions
description: Distinguish a valid GitHub connection from authority to create repositories.
---

A working GitHub App connection does not establish repository-creation permission. Treat a creation-specific HTTP 403 as a capability issue, not automatically an expired login.

**Why:** A healthy connection could read the account and list repositories, but both GraphQL `createRepository` and REST `POST /user/repos` returned “Resource not accessible by integration.” The REST response identified `administration=write` or `repository_creation=write` as the required permission alternatives.

**How to apply:** Check the endpoint's required permissions before repeating creation attempts or reconnecting. Reauthorization helps only when the missing permission can actually be granted. An account owner can instead create an empty repository manually; then verify push access separately, since repository creation and contents access are different permissions. Never infer that a failed creation request created a repository.
