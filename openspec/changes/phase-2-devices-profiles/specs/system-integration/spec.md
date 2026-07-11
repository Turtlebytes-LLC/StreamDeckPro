# System Integration

## ADDED Requirements

### Requirement: Installer profile management

install.sh SHALL provide a `profile` subcommand: `profile list` (marking the
active one), `profile create <name>` (scaffolding
profiles/<name>/{buttons,dials,touchscreen}), and `profile use <name>` (writing
`.profile`). Creating or using `default` refers to the top-level layout and
SHALL NOT be scaffolded as a directory.

#### Scenario: create scaffolds the profile tree
- **WHEN** `./install.sh profile create work` runs
- **THEN** profiles/work/buttons, profiles/work/dials, profiles/work/touchscreen exist

#### Scenario: use sets the active profile
- **WHEN** `./install.sh profile use work` runs after creating it
- **THEN** `.profile` contains `work`

#### Scenario: list marks the active profile
- **WHEN** `./install.sh profile use work` then `./install.sh profile list` run
- **THEN** the output line for `work` is marked active

#### Scenario: refuse to create default
- **WHEN** `./install.sh profile create default` runs
- **THEN** it fails with a message and creates no directory
