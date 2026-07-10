# Tasks: v2 Platform Upgrade (Roadmap)

This change produces planning artifacts, not code. Phase changes get full
artifacts only when their prerequisite phase has archived (design Decision
1) - designing against code that an earlier phase will reshape would be
guesswork.

## 1. Baseline

- [x] 1.1 Baseline specs exist and validate: openspec/specs/{daemon-core,action-scripts,configurator,system-integration}/spec.md. Verify: `openspec spec list` shows all four.

## 2. Phase changes

- [x] 2.1 Create change `phase-1-foundation` with FULL artifacts (proposal, delta specs, design, tasks) meeting the Opus test. Verify: `openspec validate phase-1-foundation` passes.
- [x] 2.2 Create change `phase-2-devices-profiles` with proposal. Design/specs/tasks: after phase 1 archives.
- [x] 2.3 Create change `phase-3-beauty` with proposal. Design/specs/tasks: after phase 2 archives.
- [x] 2.4 Create change `phase-4-community` with proposal. Design/specs/tasks: after phase 3 archives.

## 3. Review

- [x] 3.1 HUMAN VERIFY: Zach reviews the roadmap and phase-1 artifacts and approves before implementation begins. (Approved 2026-07-10.)
