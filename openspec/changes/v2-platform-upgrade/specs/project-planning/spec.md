# Project Planning

## ADDED Requirements

### Requirement: Phased spec-driven development

v2 work SHALL proceed as four ordered OpenSpec changes (phase-1-foundation,
phase-2-devices-profiles, phase-3-beauty, phase-4-community), each with
artifacts meeting the self-containment rules in openspec/config.yaml. Phase 1
must archive before phases 2-4 begin implementation; phases 3 and 4 may run
in parallel after phase 2.

#### Scenario: phase changes exist with full artifacts
- **WHEN** `openspec list` runs after this change is applied
- **THEN** all four phase changes are listed, and `openspec validate <name>` passes for phase-1-foundation
