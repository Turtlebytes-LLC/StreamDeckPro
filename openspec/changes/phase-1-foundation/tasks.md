# Tasks: Phase 1 - Foundation

Implement in order. Every task ends with the daemon startable. Design
decisions referenced as D1-D8. Run all commands from the repo root.

## 0. Root organization - safe moves first (D8)

- [x] 0.1 Move convert-icon.py, download-icons.sh, record-macro.sh, update-status.sh to utils/; update every reference (known: configurator-electron/main.js, configurator-electron/preload.js, examples/dev-actions/play-macro.sh; re-grep each filename repo-wide excluding node_modules and .git to catch the rest). Verify: the repo-layout spec's "no stale references" grep returns only utils/ paths, and `./configure` still launches.
      NOTE: record-macro.sh and update-status.sh needed INTERNAL path rewrites, not just reference updates - record-macro.sh built $SCRIPT_DIR/macros and called $SCRIPT_DIR/utils/macro-*.py (now REPO_ROOT/macros and $SCRIPT_DIR/macro-*.py); update-status.sh wrote $ACTIONS_DIR/touchscreen (ACTIONS_DIR now resolves to repo root via ../). Path resolution dry-run confirmed all targets exist. Remaining grep hit is setup-status-updater.sh:20 (a crontab grep pattern, still matches; that file is deleted in 5.4).
- [x] 0.2 Move SESSION-SUMMARY.md, SINGLE-INSTANCE.md, TESTING.md, CONFIGURATOR-CONSOLIDATED.md to docs/archive/. Verify: `ls *.md` at root shows only README.md. (Confirmed: root has only README.md.)
- [x] 0.3 Create docs/README.md index: one line per doc in docs/ (excluding archive/) describing what it covers. Verify: every `docs/*.md` filename appears in the index. (Confirmed via grep loop: all listed.)

## 1. Safety net

- [ ] 1.1 Create tests/conftest.py with FakeDeck (D2: exact method list in the design) and a fixture that imports streamdeck-daemon.py via importlib.util.spec_from_file_location. Verify: `python -m pytest tests/ --collect-only` exits 0.
- [ ] 1.2 Write tests/test_events.py characterization tests (D2 list: press, longpress suppression, dial events, tap vs swipe threshold, long-swipe edge rules) with subprocess.Popen monkeypatched. Verify: `python -m pytest tests/test_events.py -q` all pass against the current single file.
- [ ] 1.3 Write tests/test_rendering.py (priority order, label wrap, sidecar files, 800x100 strip with 4 px dividers). Verify: `python -m pytest tests/test_rendering.py -q` passes.
- [ ] 1.4 Write tests/test_actions.py and tests/test_watcher.py (D2 list). Verify: `python -m pytest tests/ -q` all pass.

## 2. Package split (D1)

- [ ] 2.1 Create streamdeckpro/{__init__.py,config.py}: move path constants and DEVICE_PROFILES per D1; streamdeck-daemon.py imports them from the package (delete its local copies). Verify: `python -m pytest tests/ -q` passes and `python -c "import streamdeckpro.config"` exits 0.
- [ ] 2.2 Create streamdeckpro/rendering.py: move the functions listed in D1 as free functions with explicit args; daemon file delegates to them. Verify: `python -m pytest tests/ -q` passes.
- [ ] 2.3 Create streamdeckpro/actions.py (execute_script, create_script_template); add SDP_HOME to the Popen env (D7). Verify: `python -m pytest tests/test_actions.py -q` passes.
- [ ] 2.4 Create streamdeckpro/events.py with EventDispatcher (D1 constructor contract). Verify: `python -m pytest tests/test_events.py -q` passes.
- [ ] 2.5 Create streamdeckpro/device.py with DeviceConnection (D1 method list). Verify: `python -m pytest tests/ -q` passes.
- [ ] 2.6 Create streamdeckpro/watcher.py with FileWatcher (D1). Verify: `python -m pytest tests/test_watcher.py -q` passes.
- [ ] 2.7 Create streamdeckpro/daemon.py (orchestrator + main) and streamdeckpro/__main__.py; re-point tests at the package; replace streamdeck-daemon.py with the 3-line shim (D1). Verify: `python -m pytest tests/ -q` passes AND `./start` then `./stop` works (daemon logs a clean connect or a clean no-device message).
- [ ] 2.8 HUMAN VERIFY: on the physical Stream Deck Plus - press a button, long-press a button, rotate a dial, tap a zone, swipe a zone, replace an icon file and watch it hot-reload, change brightness from the configurator.

## 3. Logging (D3)

- [ ] 3.1 Create streamdeckpro/logging_setup.py; wire into daemon.py; downgrade per-poll chatter to DEBUG; add logs/ to .gitignore. Verify: `python -m pytest tests/ -q` passes; start daemon 60 s; `ls -la logs/daemon.log` exists and old-style root daemon.log is not recreated.
- [ ] 3.2 Delete the legacy 238M daemon.log. Verify: `test ! -f daemon.log`.

## 4. Unify listeners (D4)

- [ ] 4.1 Create listeners/generate-status-image.py merging generate-volume-image.py, generate-cpu-image.py, generate-cpu-chart.py behind --kind. Verify: `python listeners/generate-status-image.py --kind volume --value 42 --out /tmp/v.png && file /tmp/v.png` reports PNG.
- [ ] 4.2 Create listeners/status-listener.sh with script-relative paths (D4). Verify: `bash -n listeners/status-listener.sh` and a 5 s manual run writes touchscreen/touch-1.png (then restore the original png).
- [ ] 4.3 Create streamdeck-listener@.service template; update install.sh later (task 5) to install it. Verify: `systemd-analyze verify listeners/streamdeck-listener@.service` reports no errors (warnings ok).
- [ ] 4.4 Delete volume-status-listener.sh, mute-status-listener.sh, cpu-listener-zone4.sh, generate-volume-image.py, generate-cpu-image.py, generate-cpu-chart.py, volume-status-listener.service, mute-status-listener.service, update-volume-display.sh, volume-listener-zone3.sh; disable old units if enabled (`systemctl --user disable --now volume-status-listener mute-status-listener 2>/dev/null; true`). Verify: `git status` shows only intended deletions; `systemctl --user list-units 'streamdeck*' --all` shows no old listener units running.

## 5. Installer (D5, D6)

- [ ] 5.1 Create install.sh with subcommands deps/udev/autostart/listeners/all/uninstall/doctor/help, absorbing the scripts listed in D5; autostart installs ONLY the systemd unit and removes desktop-entry autostart (D6). Verify: `bash -n install.sh` exits 0 and `./install.sh help` lists all subcommands.
- [ ] 5.2 Implement the guided no-args flow (D5): numbered steps deps -> udev -> device check -> autostart? -> listeners?, PASS/FAIL per step, confirmation before system-state changes, `all --yes` non-interactive. Verify: `echo n | ./install.sh` runs the walkthrough and exits cleanly having changed nothing when every prompt is declined.
- [ ] 5.3 Implement `install.sh doctor` (D5 check list, exact fix command per FAIL); update the daemon's USB-permissions help text in streamdeckpro/device.py to reference it. Verify: `./install.sh doctor` on the working machine prints all PASS; `grep -rn 'setup-udev-rules' streamdeckpro/` returns nothing.
- [ ] 5.4 Delete the 14 superseded setup/cleanup scripts listed in D5. Verify: `ls setup-*.sh deploy-power-user.sh 2>/dev/null` returns nothing and `./start && ./stop` still works.
- [ ] 5.5 Rewrite README Quick Start to three steps: clone, `./install.sh`, `./configure` (D5). Verify: the Quick Start section contains no other commands.
- [ ] 5.6 HUMAN VERIFY: `./install.sh autostart` then log-out/log-in (or reboot): exactly one daemon instance runs (`pgrep -fc streamdeckpro` is 1).

## 6. Script-authoring toolkit (D7 + script-authoring delta spec)

- [ ] 6.1 Create lib/sdp-helpers.sh implementing all seven functions in the delta spec. Verify: run the three spec scenarios (source+type check, state round-trip, toggle flips) - all pass.
- [ ] 6.2 Create templates/ with the five templates (D7). Verify: `bash -n templates/*.sh` exits 0.
- [ ] 6.3 Rewrite create-action per D7 (flags + interactive, target regex, --force). Verify: run the two spec scenarios (non-interactive scaffold in a temp copy, clobber refusal).
- [ ] 6.4 Write docs/WRITING-ACTIONS.md with the six sections from D7. Verify: every sdp_ function name from lib/sdp-helpers.sh appears in the doc (`grep -o 'sdp_[a-z_]*' lib/sdp-helpers.sh | sort -u` vs same grep on the doc).

## 7. Repo cleanup (D8)

- [ ] 7.1 Delete StreamDeckPro.old/, custom-scripts-backup/, .cleanup-archive/, "touchscreen/touch-4 (conflicted copy).png". Verify: `git status` clean of surprises; `./start && ./stop` works.
- [ ] 7.2 Grep configurator-electron/ (excluding node_modules) for references to index.html/renderer.js/setup-*.sh/daemon.log; update stale path constants; delete dead index.html + renderer.js if unreferenced. Verify: `./configure` launches and can save a button change.
- [ ] 7.3 Update README paths for install.sh, logs/, and utils/ (moves happened in task 0; full README rewrite is phase 4). Verify: `grep -n 'setup-.*\.sh\|daemon\.log' README.md` returns no stale root paths.

## 8. Close out

- [ ] 8.1 Full test suite + lint pass. Verify: `python -m pytest tests/ -q` all green; `bash -n` on every remaining root and lib/listeners/templates script exits 0.
- [ ] 8.2 Root whitelist check (D8 / repo-layout spec): every visible root entry is on the whitelist - no stray .py, .sh setup scripts, .log, or extra .md files. Verify: `ls` output matches the D8 whitelist exactly.
- [ ] 8.3 HUMAN VERIFY: one full day of normal desk use with no daemon restarts, then archive this change (`openspec archive phase-1-foundation`).
