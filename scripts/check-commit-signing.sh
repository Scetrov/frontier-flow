#!/usr/bin/env sh
set -eu

signing_enabled="$(git config --type=bool --get commit.gpgsign 2>/dev/null || printf 'false')"
if [ "$signing_enabled" != "true" ]; then
  echo "This repository requires Git commit signing to be enabled via commit.gpgsign." >&2
  echo "Configure commit signing in your Git settings before committing:" >&2
  echo "  git config --global commit.gpgsign true    # or use --local for this repo only" >&2
  echo "  git config --global user.signingkey <gpg-key-id>" >&2
  echo "If you use SSH signing, also configure gpg.format ssh." >&2
  echo "  git config --global gpg.format ssh" >&2
  echo "  git config --global user.signingkey <ssh-public-key>" >&2
  echo "  # or configure gpg.ssh.defaultKeyCommand <command-to-output-ssh-public-key>" >&2
  exit 1
fi

signing_format="$(git config --get gpg.format 2>/dev/null || printf 'openpgp')"
if [ "$signing_format" = "ssh" ]; then
  signing_key="$(git config --get user.signingkey 2>/dev/null || true)"
  default_key_cmd="$(git config --get gpg.ssh.defaultKeyCommand 2>/dev/null || true)"
  if [ -z "$signing_key" ] && [ -z "$default_key_cmd" ]; then
    echo "SSH commit signing is enabled, but neither user.signingkey nor gpg.ssh.defaultKeyCommand is configured." >&2
    echo "Configure one of the following before committing:" >&2
    echo "  git config --global user.signingkey <ssh-public-key>" >&2
    echo "  git config --global gpg.ssh.defaultKeyCommand <command-to-output-ssh-public-key>" >&2
    exit 1
  fi
fi