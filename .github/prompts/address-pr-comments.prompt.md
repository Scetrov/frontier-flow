---
agent: agent
name: address-pr-comments
description: Review and address all unresolved comments on a GitHub Pull Request, implement the requested changes, and commit the fixes.
model: GPT-5.4 (copilot)
---

# Address PR Comments Agent

## Purpose

This prompt guides an AI agent to review and address all **unresolved** comments on a GitHub Pull Request,
implement the requested changes, and commit the fixes. When replying to review feedback,
prefer a **single batched review submission** so reviewers receive one grouped notification instead
of one notification per reply.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- GitHub MCP server available with PR tools activated
- Current branch matches the PR branch being addressed
- Repository has uncommitted changes handled (stash or commit first)
- Ensure `GH_PAGER` is set to `cat` to avoid pagination issues with less requiring user interaction

## User Input

```text
$ARGUMENTS
```

The user may provide:

- A PR number (e.g., `26`)
- A PR URL (e.g., `https://github.com/owner/repo/pull/26`)
- Nothing (use current branch's PR)

## Execution Flow

### Phase 1: PR Discovery & Context Gathering

1. **Determine the target PR**:
   - If PR number provided in `$ARGUMENTS`, use it directly
   - If PR URL provided, extract the PR number
   - If no argument, detect PR from current branch:

     ```bash
     gh pr view --json number --jq '.number'
     ```

2. **Verify branch alignment**:
   - Get current git branch: `git branch --show-current`
   - Get PR head branch via `gh pr view <number> --json headRefName --jq '.headRefName'`
   - If branches don't match, STOP and ask user to switch branches first

3. **Fetch PR metadata**:

   ```bash
   gh pr view <number> --json title,body,state,reviewDecision,reviews,comments
   ```

### Phase 2: Retrieve All Review Comments

1. **Get repository details**:

   ```bash
   gh repo view --json owner,name --jq '{owner: .owner.login, name: .name}'
   ```

2. **Get all PR review threads with resolution status**:

   ```bash
   # Replace OWNER, REPO, and PR_NUMBER with actual values
   gh api graphql -f query='
     query($owner: String!, $repo: String!, $pr: Int!) {
       repository(owner: $owner, name: $repo) {
         pullRequest(number: $pr) {
           reviewThreads(first: 100) {
             nodes {
               id
               isResolved
               isOutdated
               path
               line
               comments(first: 10) {
                 nodes {
                   databaseId
                   body
                   author { login }
                   createdAt
                 }
               }
             }
           }
         }
       }
     }
   ' -f owner=OWNER -f repo=REPO -F pr=PR_NUMBER
   ```

3. **Filter to unresolved threads only**:
   - `isResolved: false`
   - Optionally include `isOutdated: false` to skip comments on old code

### Phase 3: Analyze & Categorize Comments

For each unresolved comment, categorize as:

| Category          | Action Required                          |
| ----------------- | ---------------------------------------- |
| **Code Change**   | Modify source file at specified location |
| **Documentation** | Update docs, comments, or Rustdoc        |
| **Test Addition** | Add or modify test cases                 |
| **Clarification** | Reply with explanation (no code change)  |
| **Out of Scope**  | Mark for follow-up issue creation        |
| **Disagree**      | Prepare response explaining rationale    |

Create a structured todo list:

```json
{
  "pr_number": 26,
  "unresolved_count": 5,
  "comments": [
    {
      "id": "thread_id",
      "path": "src/lib.rs",
      "line": 42,
      "category": "Code Change",
      "summary": "Add error handling for edge case",
      "reviewer": "reviewer_username",
      "action_plan": "Add match arm for empty input"
    }
  ]
}
```

### Phase 4: Address Each Comment

For each comment requiring code changes:

1. **Read the relevant file context**:
   - Use `read_file` tool to get surrounding context (±20 lines around the comment line)
   - Understand the current implementation

2. **Implement the fix**:
   - Use `replace_string_in_file` or `multi_replace_string_in_file` for edits
   - Follow Constitution principles (TDD, Clean Code, Security-First)
   - If the fix requires new tests, add them first (Red-Green-Refactor)

3. **Validate the change**:
   - Run `cargo fmt` to ensure formatting
   - Run `cargo clippy` to check for warnings
   - Run relevant tests: `cargo test --workspace`

4. **Prepare reply text** for each addressed comment:

   ```markdown
   Addressed in commit [SHA]:

   - [Brief description of the change]
   - [Any additional context or decisions made]
   ```

5. **Prepare batched review content**:
   - Keep a per-thread reply for each unresolved thread
   - Also prepare one overall review summary covering all addressed, clarified, and deferred items
   - Keep broad rationale in the review summary and thread-specific details in the thread reply

### Phase 5: Commit Changes

1. **Stage changes by category** (prefer atomic commits):

   ```bash
   git add <files_for_comment_1>
   git commit -m "fix(scope): address review comment - <summary>

   Addresses review comment by @reviewer on PR #<number>:
   <quote first line of comment>

   Changes:
   - <change 1>
   - <change 2>"
   ```

2. **Alternative: Single commit for multiple related comments**:

   ```bash
   git add -A
   git commit -m "fix: address PR #<number> review comments

   Addresses the following review feedback:
   - @reviewer1: <summary of fix 1>
   - @reviewer2: <summary of fix 2>

   Changes:
   - <change 1>
   - <change 2>
   - <change 3>"
   ```

3. **Push changes**:

   ```bash
   git push origin HEAD
   ```

### Phase 6: Submit One Batched Review

Do **not** post each reply individually unless batching is unavailable. Prefer one pending review,
attach all thread replies to it, then submit once so GitHub sends one grouped notification.

1. **Create a pending review**:

   ```bash
   # Replace PR_NODE_ID with the pull request GraphQL node id
   gh api graphql -f query='
      mutation($pullRequestId: ID!) {
         addPullRequestReview(input: {pullRequestId: $pullRequestId}) {
            pullRequestReview {
               id
            }
         }
      }
   ' -f pullRequestId=PR_NODE_ID
   ```

2. **Add a reply for each unresolved thread to that pending review**:

   ```bash
   # Replace REVIEW_ID and THREAD_ID with GraphQL node ids
   gh api graphql -f query='
      mutation($reviewId: ID!, $threadId: ID!, $body: String!) {
         addPullRequestReviewThreadReply(
            input: {
               pullRequestReviewId: $reviewId
               pullRequestReviewThreadId: $threadId
               body: $body
            }
         ) {
            comment {
               id
            }
         }
      }
   ' -f reviewId=REVIEW_ID -f threadId=THREAD_ID -f body='Addressed in commit abc1234.
   - Added null check for empty input
   - Updated tests to cover the edge case'
   ```

3. **Submit the review once all thread replies are attached**:

   ```bash
   gh api graphql -f query='
      mutation($reviewId: ID!, $body: String!) {
         submitPullRequestReview(
            input: {
               pullRequestReviewId: $reviewId
               event: COMMENT
               body: $body
            }
         ) {
            pullRequestReview {
               id
               url
            }
         }
      }
   ' -f reviewId=REVIEW_ID -f body='Addressed PR feedback in the linked commit(s).

   Summary:
   - Resolved the requested code and test updates
   - Added clarifications where code changes were not needed
   - Deferred any out-of-scope items explicitly'
   ```

4. **Fallback only if batching is unavailable**:
   - Prefer GitHub MCP review tools if they support pending reviews and thread replies
   - If review batching is not available, fall back to individual replies and warn that multiple notifications may be sent
   - Avoid mixing batched review replies and individual replies unless the tooling forces it

### Phase 7: Summary Report

Output a summary:

```markdown
## PR #<number> Review Comments Addressed

**Total unresolved comments**: X
**Addressed**: Y
**Deferred/Out of scope**: Z

### Commits Created

| Commit  | Files                | Comments Addressed |
| ------- | -------------------- | ------------------ |
| abc1234 | src/lib.rs           | #1, #3             |
| def5678 | tests/integration.rs | #2                 |

### Review Submission

- [x] Submitted one batched review for addressed threads
- [x] Included per-thread replies in the review
- [ ] Comment #3 by @reviewer3 - Deferred (created issue #XX)

### Follow-up Items

- Issue #XX: <out of scope item>
```

## Error Handling

- **Branch mismatch**: Stop and instruct user to checkout correct branch
- **Merge conflicts**: Stop and ask user to resolve conflicts first
- **Test failures**: Report which tests fail and ask for guidance
- **Unclear comments**: Ask for clarification before making changes
- **Permissions issues**: Report and suggest manual gh auth refresh
- **Batch review unsupported**: Fall back to individual replies only after stating that multiple notifications may be sent

## Constitution Compliance

This workflow MUST adhere to:

- **Principle I (TDD)**: If adding functionality, write tests first
- **Principle IV (Clean Code)**: Ensure changes are readable and maintainable
- **Principle V (Security-First)**: Review any security implications of changes
- **Commit Hygiene**: GPG-signed commits with conventional commit messages
- **Branching Workflow**: Work on the correct feature branch

## Example Usage

```text
User: Address comments on PR 26
Agent:
1. Fetching PR #26 details...
2. Found 3 unresolved review threads
3. Categorizing comments:
   - Comment 1: Code change needed in src/routing.rs:142
   - Comment 2: Documentation update in docs/USAGE.md
   - Comment 3: Clarification question (will reply)
4. Implementing fixes...
5. Running validation (fmt, clippy, tests)...
6. Committing changes...
7. Submitting one batched review...
8. Summary: 2 code changes committed, 1 clarification included in the batched review
```

## Quick Reference Commands

```bash
# View PR details
gh pr view <number>

# List all comments
gh pr view <number> --comments

# Get review threads (GraphQL)
gh api graphql -f query='...'

# Create a pending review
gh api repos/{owner}/{repo}/pulls/{pr}/reviews --method POST

# Submit a pending review
gh api repos/{owner}/{repo}/pulls/{pr}/reviews/{review_id}/events --method POST -f event=COMMENT -f body="..."

# Push and update PR
git push origin HEAD

# Re-request review after addressing comments
gh pr edit <number> --add-reviewer <username>
```
