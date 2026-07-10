# Proposal: Phase 4 - Community

## Why

Go-to status is a distribution problem as much as a software problem. People
adopt what installs in one command, has docs that answer their first five
questions, and lets them import someone else's cool setup.

## What Changes

- **Packaging**: AUR package, .deb, and Flatpak for the configurator +
  pipx-installable daemon. CI builds on tag.
- **Docs site**: static site (GitHub Pages) with quick start, action
  gallery, WRITING-ACTIONS guide, plugin authoring guide, troubleshooting.
  README.md rewritten as a short landing page pointing at it.
- **Sharing format**: `.sdpack` (tar.gz with manifest) bundling a profile -
  scripts, icons, labels, plugin configs. `sdp export/import` commands and
  configurator import UI.
- **Project hygiene for contributors**: CONTRIBUTING.md, issue templates,
  CI running pytest + shellcheck on PRs.

## Capabilities

### New Capabilities
- `packaging-install`
- `profile-sharing`

### Modified Capabilities
- `system-integration`: packaged installs alongside git-clone installs

## Non-goals

- A hosted pack registry with accounts (sharing is file-based; a curated
  awesome-list repo is enough to start).
- Snap packaging.

## Migration Safety

Packaged installs must never fight a git-clone install: the daemon detects
its install mode and install.sh refuses to run inside a packaged install.

## Impact

Detailed design and tasks are written AFTER phase-3 archives. Can start docs
site content earlier if phases run long - it only documents shipped behavior.
