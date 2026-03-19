---
agent: agent
name: commit
description: This prompt is designed to automate the process of running pre-commit hooks, fixing any issues that arise, and managing the Git workflow for committing and pushing changes, as well as creating a Pull Request if necessary.
model: GPT-5.4 mini (copilot)
---

Please execute the following workflow for my current branch:

1. Run `pre-commit run --all-files` in the terminal.
2. If any checks fail, analyze the output, fix the code to resolve the specific errors, and re-run the pre-commit hooks until they pass.
3. Stage the modified files
4. Commit the changes with a concise, conventional commit message summarizing the fixes.
5. Push the branch to origin.
6. Use the GitHub CLI (`gh pr create`) to create a Pull Request if one does not already exist. Generate a suitable PR title and body based on the commit history of this branch, write the body to a temporary file as real multiline markdown, and pass it with `--body-file` instead of embedding escaped newline sequences inline. If you need to update an existing PR, reuse the same body file with `gh pr edit --body-file`.
