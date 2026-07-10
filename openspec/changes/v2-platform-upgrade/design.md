# Design: v2 Platform Upgrade (Roadmap)

## Context

StreamDeckPro is a working single-user system: a 56K single-file Python daemon
(streamdeck-daemon.py) driving an Elgato Stream Deck Plus, configured entirely
through the filesystem (executable bash scripts + .png/.txt siblings), with an
Electron configurator. It runs daily on the author's desk. The v2 program turns
it into a polished, installable, multi-device platform without ever breaking
the running setup.

## Goals / Non-Goals

**Goals:**
- Each phase ships as an independent OpenSpec change, implementable by a
  less-capable model with zero improvisation.
- The filesystem-as-config contract (buttons/*.sh etc.) is permanent public API.
- After every merged task, the daemon still runs on the physical device.

**Non-Goals:**
- Windows/macOS, cloud services, language rewrite (see proposal Non-goals).
- Doing implementation work inside THIS change. This change only produces the
  four phase changes with their artifacts.

## Decisions

### Decision 1: Phases are separate OpenSpec changes, strictly ordered
Phase 1 (foundation) must land before 2-4 because the package split creates
the module boundaries every later phase plugs into. Phases 3 and 4 may run in
parallel after phase 2.

### Decision 2: Compatibility contract is spec'd, not implied
The baseline specs in openspec/specs/ (daemon-core, action-scripts,
configurator, system-integration) define current behavior. Every phase change
must include delta specs against these, and MUST NOT modify the action-scripts
contract (only ADD to it).

### Decision 3: Artifact quality bar (the "Opus test")
Each phase change's design.md and tasks.md must pass this test: an implementer
who has read ONLY that change's artifacts and the baseline specs can complete
every task without exploring the repo or making a design decision. Concretely:
- design.md names every new/modified file with its responsibility
- tasks.md gives exact paths, function signatures, and verify commands
- Any tricky existing code the implementer must touch is quoted or summarized
  in the design, with line references

### Decision 4: Physical-device verification stays with Zach
Automated tests cover logic; a human verify step on the real device closes
each phase. Tasks mark these explicitly as "HUMAN VERIFY".

## Risks

- The daemon has no tests today; phase 1 must add a test harness before
  refactoring, or the refactor is unverifiable.
- Electron configurator has heavy node_modules churn; phase 3 should pin
  versions before touching UI.
