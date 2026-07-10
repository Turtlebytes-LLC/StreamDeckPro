"""Detached execution of action scripts, with auto-template creation."""

import os
import logging
import subprocess

from .config import SDP_HOME


def create_script_template(script_path, action_description):
    """Create a script template with a desktop notification."""
    if action_description is None:
        action_description = script_path.stem.replace('-', ' ').title()

    template = f"""#!/bin/bash
# Auto-generated script for: {action_description}
notify-send "Stream Deck" "{action_description}" -t 2000

# Add your commands below:
# Example: firefox &
# Example: xdotool key Super_L+d
"""

    script_path.parent.mkdir(parents=True, exist_ok=True)
    with open(script_path, 'w') as f:
        f.write(template)
    os.chmod(script_path, 0o755)


def execute_script(script_path, action_description=None):
    """Execute a script file detached; create it from a template if missing.

    SDP_HOME is exported into the child environment so scripts can source
    lib/sdp-helpers.sh regardless of their working directory.
    """
    logging.info(f"ACTION: {script_path.name}")

    if not script_path.exists():
        create_script_template(script_path, action_description)
        logging.info(f"Created template script: {script_path}")

    if not os.access(script_path, os.X_OK):
        os.chmod(script_path, 0o755)
        logging.info(f"Made executable: {script_path}")

    env = dict(os.environ)
    env["SDP_HOME"] = str(SDP_HOME)

    try:
        subprocess.Popen(
            [str(script_path)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            start_new_session=True,
            env=env,
        )
    except Exception as e:
        logging.error(f"Error executing {script_path}: {e}")
