#!/usr/bin/env bash
# Run once by the Team Lead from the project folder.
# Needs: git, and the GitHub CLI (gh) logged in with `gh auth login`.
set -e
REPO="${1:-chainshield-prototype}"
git init -q
git add .
git commit -q -m "Starter: all modules on fake data"
git branch -M main
gh repo create "$REPO" --private --source=. --remote=origin --push
for b in m3-risk m4-tracking m5-alerts m6-dashboard m7-btp designs data-and-tests; do
  git branch "$b" main && git push -q origin "$b"
done
OWNER=$(gh repo view --json owner -q .owner.login)
gh api -X PUT "repos/$OWNER/$REPO/branches/main/protection" --input - <<JSON
{
  "required_status_checks": { "strict": true, "contexts": ["test"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null
}
JSON
echo "Done. Now add teammates: gh api -X PUT repos/$OWNER/$REPO/collaborators/<username> -f permission=push"
