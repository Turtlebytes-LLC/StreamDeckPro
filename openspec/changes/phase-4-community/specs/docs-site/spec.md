# Docs Site

## ADDED Requirements

### Requirement: Documentation site (HUMAN VERIFY)

The system SHALL publish a static docs site built over the repo's Markdown
(quick start, action gallery, plugin/widget authoring, profile sharing). Content
lives in docs/; the site is a static build (hosting + visual review).

#### Scenario: source content exists
- **WHEN** the docs/ dir is listed
- **THEN** PROFILES.md, PLUGINS.md, BEAUTY.md, and WRITING-ACTIONS.md are present

#### Scenario: site builds and reads well (HUMAN VERIFY)
- **WHEN** the site is built and opened
- **THEN** quick start, gallery, and authoring guides render correctly (verified by Zach)
