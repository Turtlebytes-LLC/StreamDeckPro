# Icon Packs

## ADDED Requirements

### Requirement: Icon pack format and loader

The system SHALL define an icon pack as a directory containing a `pack.json`
manifest with required fields name (a slug), display_name, and version. Icon
files (png/svg/jpg/jpeg/gif) live beneath the pack dir. The whole `icons/` tree
is the built-in pack. `streamdeckpro/iconpacks.py` SHALL provide
validate_manifest, load_pack, list_packs, pack_icons, and resolve_icon.
Resolution SHALL exclude icons owned by nested packs.

#### Scenario: valid manifest passes, invalid reports errors
- **WHEN** `validate_manifest({"name":"x","display_name":"X","version":"1.0.0"})` runs
- **THEN** it returns `[]`; a manifest missing display_name returns a non-empty error list

#### Scenario: name with spaces rejected
- **WHEN** a manifest has `"name": "bad name"`
- **THEN** `validate_manifest` reports a slug error and `load_pack` returns None

#### Scenario: list finds every pack
- **WHEN** two directories each contain a valid pack.json under a root
- **THEN** `list_packs(root)` returns both, sorted by name

#### Scenario: nested pack icons are not claimed by the parent
- **WHEN** pack `main` contains icon play.png and a nested pack `sub` contains stop.png
- **THEN** `resolve_icon(main, "stop")` is None and `resolve_icon(sub, "stop")` finds it

#### Scenario: built-in pack ships and is valid
- **WHEN** `load_pack(icons/)` runs from the repo
- **THEN** it returns a manifest with name `builtin` and `pack_icons(icons/)` is non-empty
