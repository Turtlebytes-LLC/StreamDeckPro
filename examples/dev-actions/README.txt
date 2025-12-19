===============================================================================
                    DEVELOPER ACTIONS - 78 SCRIPTS
===============================================================================

Ready-to-use keyboard shortcuts and commands for programmers!
Perfect for VSCode, terminals, and development workflows.

Copy any script to your Stream Deck actions:
  cp examples/dev-actions/arrow-up.sh dials/dial-1-cw.sh
  cp examples/dev-actions/git-status.sh buttons/button-1.sh


NAVIGATION (12 scripts)
=======================
arrow-up.sh               - Press Up arrow
arrow-down.sh             - Press Down arrow
arrow-left.sh             - Press Left arrow
arrow-right.sh            - Press Right arrow
page-up.sh                - Page Up
page-down.sh              - Page Down
home.sh                   - Go to beginning of line
end.sh                    - Go to end of line
word-left.sh              - Jump word left (Ctrl+Left)
word-right.sh             - Jump word right (Ctrl+Right)
escape.sh                 - Press Escape
enter.sh                  - Press Enter


CODE EDITING (14 scripts)
==========================
select-line.sh            - Select entire line (Ctrl+L)
duplicate-line.sh         - Duplicate line (Ctrl+Shift+D)
delete-line.sh            - Delete line (Ctrl+Shift+K)
move-line-up.sh           - Move line up (Alt+Up)
move-line-down.sh         - Move line down (Alt+Down)
comment-toggle.sh         - Toggle line comment (Ctrl+/)
block-comment.sh          - Toggle block comment (Ctrl+Shift+A)
format-document.sh        - Format document (Shift+Alt+F)
indent.sh                 - Indent line (Tab)
outdent.sh                - Outdent line (Shift+Tab)
backspace.sh              - Press Backspace
delete.sh                 - Press Delete
select-all.sh             - Select all (Ctrl+A)
select-word.sh            - Select word (Ctrl+D)


CODE NAVIGATION (8 scripts)
============================
go-to-definition.sh       - Go to definition (F12)
peek-definition.sh        - Peek definition (Alt+F12)
go-back.sh                - Go back to previous location (Ctrl+Alt+-)
go-forward.sh             - Go forward (Ctrl+Shift+-)
show-symbols.sh           - Show symbols/outline (Ctrl+Shift+O)
show-references.sh        - Show all references (Shift+F12)
rename-symbol.sh          - Rename symbol (F2)
quick-open.sh             - Quick open file (Ctrl+P)


SEARCH & REPLACE (4 scripts)
=============================
find-next.sh              - Find next (F3)
find-previous.sh          - Find previous (Shift+F3)
replace.sh                - Find and replace (Ctrl+H)
multi-cursor-next.sh      - Add cursor to next match (Ctrl+D)


MULTI-CURSOR (2 scripts)
=========================
multi-cursor-all.sh       - Add cursors to all matches (Ctrl+Shift+L)
column-select.sh          - Column/box selection (Shift+Alt+Down)


IDE INTERFACE (7 scripts)
==========================
command-palette.sh        - Command palette (Ctrl+Shift+P)
toggle-terminal.sh        - Toggle integrated terminal (Ctrl+`)
toggle-sidebar.sh         - Toggle sidebar (Ctrl+B)
split-editor.sh           - Split editor (Ctrl+\)
focus-editor-1.sh         - Focus first editor group (Ctrl+1)
focus-editor-2.sh         - Focus second editor group (Ctrl+2)
problems-panel.sh         - Show problems panel (Ctrl+Shift+M)
output-panel.sh           - Show output panel (Ctrl+Shift+U)


DEBUGGING (9 scripts)
======================
run-code.sh               - Run code (F5)
debug-start.sh            - Start debugging (F5)
debug-stop.sh             - Stop debugging (Shift+F5)
debug-continue.sh         - Continue/Resume (F5)
debug-step-over.sh        - Step over (F10)
debug-step-into.sh        - Step into (F11)
debug-step-out.sh         - Step out (Shift+F11)
toggle-breakpoint.sh      - Toggle breakpoint (F9)
terminal-interrupt.sh     - Interrupt/cancel (Ctrl+C)


GIT COMMANDS (7 scripts)
=========================
git-status.sh             - Git status
git-add-all.sh            - Git add all files
git-commit.sh             - Start git commit (type message)
git-push.sh               - Git push
git-pull.sh               - Git pull
git-diff.sh               - Git diff
git-log.sh                - Git log (last 10 commits)


NPM COMMANDS (4 scripts)
=========================
npm-install.sh            - NPM install
npm-start.sh              - NPM start
npm-test.sh               - NPM test
npm-build.sh              - NPM build


DOCKER COMMANDS (3 scripts)
============================
docker-ps.sh              - List containers
docker-compose-up.sh      - Docker compose up
docker-compose-down.sh    - Docker compose down


PYTHON (2 scripts)
==================
python-run.sh             - Run Python file (types "python3 ")
pip-install.sh            - Pip install (types "pip3 install ")


BUILD TOOLS (2 scripts)
========================
make.sh                   - Run make
make-clean.sh             - Make clean


TERMINAL (3 scripts)
=====================
terminal-clear.sh         - Clear terminal (Ctrl+L)
cd-back.sh                - Go to parent directory
ls-la.sh                  - List files (ls -la)


USAGE EXAMPLES:
===============

Arrow Keys on Dials:
  cp examples/dev-actions/arrow-up.sh dials/dial-1-cw.sh
  cp examples/dev-actions/arrow-down.sh dials/dial-1-ccw.sh
  cp examples/dev-actions/arrow-left.sh dials/dial-2-ccw.sh
  cp examples/dev-actions/arrow-right.sh dials/dial-2-cw.sh

Git Workflow on Buttons:
  cp examples/dev-actions/git-status.sh buttons/button-1.sh
  cp examples/dev-actions/git-add-all.sh buttons/button-2.sh
  cp examples/dev-actions/git-commit.sh buttons/button-3.sh
  cp examples/dev-actions/git-push.sh buttons/button-4.sh

Debugging on Touchscreen Zones:
  cp examples/dev-actions/debug-start.sh touchscreen/touch-1.sh
  cp examples/dev-actions/toggle-breakpoint.sh touchscreen/touch-2.sh
  cp examples/dev-actions/debug-step-over.sh touchscreen/touch-3.sh
  cp examples/dev-actions/debug-step-into.sh touchscreen/touch-4.sh

Code Navigation on Touchscreen Swipes:
  cp examples/dev-actions/go-to-definition.sh touchscreen/touch-1-swipe-up.sh
  cp examples/dev-actions/go-back.sh touchscreen/touch-1-swipe-left.sh
  cp examples/dev-actions/go-forward.sh touchscreen/touch-1-swipe-right.sh

Page Navigation on Dial Long Press:
  cp examples/dev-actions/page-up.sh dials/dial-3-longpress.sh
  cp examples/dev-actions/page-down.sh dials/dial-4-longpress.sh


NOTES:
======
- Most shortcuts are optimized for VSCode but work in many editors
- Git/npm/docker commands type text in terminal then press Enter
- Terminal commands execute immediately
- Customize any script to fit your workflow!
- All scripts use xdotool for keyboard automation


TOTAL: 78 Developer-Focused Scripts
===============================================================================
