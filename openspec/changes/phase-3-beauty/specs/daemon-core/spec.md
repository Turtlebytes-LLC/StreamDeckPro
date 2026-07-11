# Daemon Core

## ADDED Requirements

### Requirement: Animated icon frame extraction

The renderer SHALL load animated images (GIF/WebP) showing the first frame for
static rendering, and SHALL provide `load_animation_frames(path, size,
max_frames)` returning sized RGB frames plus per-frame durations (frame count
capped for CPU) and `is_animated(path)`. Static images yield a single frame.

#### Scenario: animated file shows first frame as a button image
- **WHEN** a button has a `.gif` and `load_image_for_button` runs
- **THEN** it returns a rendered RGB image (frame 0), not the numeric placeholder

#### Scenario: frames extracted with a cap
- **WHEN** `load_animation_frames(gif, (72,72), max_frames=4)` runs on a 10-frame GIF
- **THEN** it returns 4 frames, each sized (72,72)

#### Scenario: static image is a single frame
- **WHEN** `load_animation_frames(png, size)` runs on a PNG
- **THEN** it returns exactly one frame and one duration

#### Scenario: on-device animation loop (HUMAN VERIFY, deferred)
- **WHEN** the frame-cycling render loop is implemented and a GIF key is shown
- **THEN** it animates on the physical deck within the CPU cap (verified by Zach)
