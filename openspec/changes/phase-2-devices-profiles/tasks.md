# Tasks: Phase 2 - Devices, Profiles, Plugins

Ordered so the daemon stays working after every task. `[x]` = done and
verified this session; `[ ]` = remaining (plugin-api impl and hardware verify).

## 1. Profiles core

- [x] 1.1 Add `PROFILES_DIR` and `PROFILE_FILE` to streamdeckpro/config.py. Verify: `python -c "from streamdeckpro import config; print(config.PROFILES_DIR.name, config.PROFILE_FILE.name)"` prints `profiles .profile`.
- [x] 1.2 Create streamdeckpro/profiles.py with `ProfileManager` (active_profile_name, list_profiles, BUTTONS_DIR/DIALS_DIR/TOUCH_DIR properties, config delegation). Verify: `python -m pytest tests/test_profiles.py -q` passes.
- [x] 1.3 Wire ProfileManager into streamdeckpro/daemon.py (self.paths; pass to EventDispatcher and FileWatcher; rendering reads self.paths). Verify: `python -m pytest -q` all green.

## 2. Profile hot-reload

- [x] 2.1 Add `FileWatcher.check_profile_change()` and call it in the daemon loop after brightness. Verify: `python -m pytest tests/test_watcher.py -q` passes (incl. profile-switch tests).

## 3. Switch actions + helpers

- [x] 3.1 Add sdp_active_profile/sdp_profile_root/sdp_list_profiles/sdp_switch_profile/sdp_cycle_profile to lib/sdp-helpers.sh and make _sdp_element_dir profile-aware. Verify: `bash templates/../lib check` - sourced functions exist and cycle wraps (manual bash run).
- [x] 3.2 Add templates/switch-profile.sh and templates/cycle-profile.sh. Verify: `bash -n templates/switch-profile.sh templates/cycle-profile.sh` exits 0.

## 4. Installer

- [x] 4.1 Add `do_profile` and the `profile` dispatch case to install.sh (list/create/use). Verify: `bash install.sh profile create work && bash install.sh profile use work && test "$(cat .profile)" = work` in a scratch dir.

## 5. Multi-device

- [x] 5.1 Confirm DEVICE_PROFILES covers Mini/Original/MK.2/XL/Plus/Neo and that daemon/events guard on dials/touchscreen counts (already true from phase 1). Verify: multi-device spec scenarios 1-3.
- [x] 5.2 Simulate Mini/MK.2/XL/Neo via FakeDeck: profile detection, dial-less/touchscreen-less skips, per-model button render count. Verify: `python -m pytest tests/test_multidevice.py -q` (12 tests). Stands in for hardware verify - Zach only owns a Plus, so a physical non-Plus test is not possible.

## 6. App-aware auto-switching

- [x] 6.1 Create streamdeckpro/appswitch.py (load_mapping, detect_window_class, resolve_profile, decide_switch, poll loop runnable as `python -m streamdeckpro.appswitch`). Verify: `python -m pytest tests/test_appswitch.py -q` passes.
- [x] 6.2 Ship app-profiles.conf.example. Verify: `python -c "from streamdeckpro.appswitch import load_mapping; print(load_mapping('app-profiles.conf.example'))"` returns a dict.
- [ ] 6.3 HUMAN VERIFY: run the poller under Hyprland/X11 and confirm focus changes switch profiles. (Needs a live session - Zach.)

## 7. Plugin API

- [x] 7.1 Document the v1 protocol and the file-based feedback path in docs/PLUGINS.md. Verify: file exists and covers LABEL/IMAGE/STATE + lifecycle.
- [ ] 7.2 Implement daemon-managed long-running plugins (spawn/restart/terminate + stdout protocol parser). Deferred to its own change; needs a hardware verify.

## 8. Docs + review

- [x] 8.1 Add docs/PROFILES.md (how profiles/hot-reload/switch actions/installer work).
- [ ] 8.2 HUMAN VERIFY: Zach reviews the profile UX on his physical deck and approves before archiving.
