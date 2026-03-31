#!/usr/bin/env sh
set -eu

signing_enabled="$(git config --type=bool --get commit.gpgsign 2>/dev/null || printf 'false')"
if [ "$signing_enabled" != "true" ]; then
  echo "Signed commits are required in frontier-flow." >&2
  echo "Enable commit signing before committing:" >&2
  echo "  git config --global commit.gpgsign true" >&2
  echo "  git config --global user.signingkey <key-id>" >&2
  echo "If you use SSH signing, also configure gpg.format ssh." >&2
  exit 1
fi

signing_format="$(git config --get gpg.format 2>/dev/null || printf 'openpgp')"
if [ "$signing_format" = "ssh" ]; then
  signing_key="$(git config --get user.signingkey 2>/dev/null || true)"
  if [ -z "$signing_key" ]; then
    echo "SSH commit signing is enabled, but user.signingkey is not configured." >&2
    echo "Set it before committing, for example:" >&2
    echo "  git config --global user.signingkey <ssh-public-key>" >&2
    exit 1
  fi
fi