# Multi-Device

## ADDED Requirements

### Requirement: Drive non-Plus Stream Deck models

The system SHALL drive Stream Deck Mini, Original, MK.2, XL, and Neo in addition
to Plus, adapting rendering and event dispatch to the model's element counts.
When a model lacks dials or a touchscreen, the daemon SHALL skip those code
paths without error. Device detection matches the reported deck type against
config.DEVICE_PROFILES, falling back to DEFAULT_PROFILE for unknown models.

#### Scenario: model table covers all supported models
- **WHEN** `python -c "from streamdeckpro.config import DEVICE_PROFILES as d; print(all(k in d for k in ['Stream Deck Mini','Stream Deck','Stream Deck MK.2','Stream Deck XL','Stream Deck Plus','Stream Deck Neo']))"` runs
- **THEN** stdout is `True`

#### Scenario: dial-less model skips dial callbacks
- **WHEN** the detected profile has `dials == 0`
- **THEN** `DeviceConnection.connect_device` does not register a dial callback

#### Scenario: touchscreen-less model skips touchscreen rendering
- **WHEN** the detected profile has `touchscreen is None`
- **THEN** `StreamDeckDaemon.update_touchscreen` returns without calling set_touchscreen_image

#### Scenario: HUMAN VERIFY on real hardware
- **WHEN** a non-Plus model (Mini or MK.2) is plugged in and the daemon starts
- **THEN** buttons render and presses fire the matching button-N.sh (verified on a physical device)
