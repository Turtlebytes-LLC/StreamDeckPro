# Profile Sharing

## ADDED Requirements

### Requirement: Export and import profiles as .sdpack

The system SHALL export a profile to a portable `.sdpack` (gzipped tar with a
top-level manifest.json of `format: sdpack/v1`, name, and subdirs, plus the
profile's buttons/dials/touchscreen tree) and import one back into
`profiles/<name>/`. `streamdeckpro/sharing.py` SHALL provide export_profile,
read_manifest, and import_pack, surfaced via `python -m streamdeckpro.sharing`
and `./install.sh profile export|import`.

#### Scenario: export then read manifest
- **WHEN** a profile with buttons is exported and `read_manifest` runs on the pack
- **THEN** the manifest has format `sdpack/v1`, the profile name, and `buttons` in subdirs

#### Scenario: round-trip preserves files
- **WHEN** a profile is exported and imported as a new name
- **THEN** the imported profile's button scripts and labels match the originals

#### Scenario: exporting a missing profile fails
- **WHEN** `export_profile` is called for a nonexistent profile
- **THEN** it raises FileNotFoundError

### Requirement: Import is traversal-safe and refuses default

Import SHALL reject non-sdpack files, SHALL require a non-`default` target name,
and SHALL NOT write any file outside the target profile directory even if the
archive contains absolute or `..` members.

#### Scenario: malicious member is ignored
- **WHEN** a pack contains a valid manifest and a member named `../../escape.txt`
- **THEN** import completes and no file is written outside the profiles dir

#### Scenario: refuse default target
- **WHEN** `import_pack(..., as_name="default")` runs
- **THEN** it raises ValueError

#### Scenario: reject non-sdpack
- **WHEN** `import_pack` runs on a tar without a valid sdpack manifest
- **THEN** it raises ValueError
