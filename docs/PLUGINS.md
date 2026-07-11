# Plugins (Long-Running Actions)

Most actions are fire-and-forget: press a key, a script runs, done. A **plugin**
is a long-running action that keeps updating its own key while it runs - a clock,
a media widget, a toggle that shows real state.

## Available today: file-based feedback

Any script can update its element by writing the element's files through the
helpers. The daemon hot-reloads them within ~0.5s, so you get two-way feedback
with no new machinery. Writes land in the **active profile's** directory.

```bash
source "$SDP_HOME/lib/sdp-helpers.sh"
while true; do
    sdp_set_label button-1 "$(date +%H:%M)"   # writes <profile>/buttons/button-1.txt
    sleep 30
done
```

`sdp_set_image <element> <path>` and `sdp_set_label <element> <text>` are the
two feedback calls; `sdp_state_get`/`sdp_state_set`/`sdp_toggle` persist state.

## Planned: daemon-managed plugin protocol v1

A future change adds daemon-owned plugin processes with a stdout line protocol,
so the daemon manages lifecycle instead of each script spinning its own loop.

Protocol (stdout, one directive per line):

```
LABEL <element> <text>      # set an element's label
IMAGE <element> <path>      # set an element's image
STATE <key> <value>         # persist a state value
```

Lifecycle rules:

- **Spawn** the plugin when the daemon starts (or its profile becomes active).
- **Restart** it if it exits unexpectedly.
- **Terminate** it on profile switch or daemon shutdown.

This is intentionally not implemented yet - it changes the daemon's execution
model and wants a hardware verify. Until then, use the file-based path above,
which is fully supported.
