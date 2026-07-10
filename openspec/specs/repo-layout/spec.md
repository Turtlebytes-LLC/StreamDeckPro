# repo-layout Specification

## Purpose
TBD - created by archiving change phase-1-foundation. Update Purpose after archive.
## Requirements
### Requirement: Minimal Root Whitelist

The repo root SHALL contain only user-facing entry points (install.sh,
start, stop, configure, create-action), the legacy daemon entry-point shim
streamdeck-daemon.py (required by daemon-core so start/stop/systemd work
unchanged), README.md, LICENSE, mise.toml, and the directories
streamdeckpro/, buttons/, dials/, touchscreen/, examples/, templates/, lib/,
listeners/, utils/, icons/, images/, macros/, docs/, tests/,
configurator-electron/, openspec/, logs/, plus dotfiles (.brightness,
.device-info.json, .gitignore, .github/, .claude/, .opencode/ and tool
caches). Helper tools live in utils/; documentation lives in docs/.

#### Scenario: root is clean
- **WHEN** `ls` runs in the repo root after phase 1
- **THEN** every visible entry is on the whitelist above; in particular no setup-*.sh, no *.py besides the streamdeck-daemon.py shim, no *.log, and no markdown besides README.md exist at the root

### Requirement: Moves Never Orphan References

Any file moved out of the root SHALL have all references to its old path
updated in the same change (search scope: repo minus node_modules and .git).

#### Scenario: no stale references after moves
- **WHEN** `grep -rn 'record-macro.sh\|download-icons.sh\|convert-icon.py\|update-status.sh' --exclude-dir=node_modules --exclude-dir=.git .` runs after the moves
- **THEN** every match points at utils/ paths (or docs), none at the repo root

### Requirement: Docs Index

docs/ SHALL contain a README.md index with one line per document describing
what it covers, so documentation is discoverable from one place.

#### Scenario: index covers the directory
- **WHEN** `ls docs/*.md` and `docs/README.md` are compared
- **THEN** every markdown file in docs/ (excluding archive/) is listed in the index

