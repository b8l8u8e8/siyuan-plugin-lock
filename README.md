# SiYuan Lock (Privacy Guard)

Protect notebooks and documents with UI locks (password or gesture). Supports trust-time unlock, idle auto-lock, and clear lock indicators in the doc tree.

## Features
- Lock notebooks and documents with password or 3x3 pattern (min 4 chars/dots).
- Two lock policies:
  - Always lock on restart (unlock once per session).
  - Trust time: stay unlocked for N minutes, then auto re-lock.
- Notebook lock behavior:
  - Auto-collapse in the doc tree.
  - Requires unlock before expanding.
  - Only affects the notebook itself; documents inside remain independent.
- Document lock behavior:
  - Document can open, but content area is covered by a lock overlay.
  - Unlock to view the content.
- Doc tree indicators:
  - Lock icon shown for locked items.
  - Trust-time locks show a live countdown to re-lock (toggle in settings).
- Idle auto-lock:
  - After X minutes of no activity, triggers SiYuan's lock screen/logout.
  - Optional countdown display (top bar or floating bubble).
  - Floating bubble is draggable and position is saved.
- Settings panel:
  - List all locks with type, lock type, policy, trust expiry/remaining.
  - Unlock or remove locks in one place.
  - Configure idle auto-lock and countdown position.
  - Toggle trust-time countdown display in the doc tree.

## Usage
- Desktop: right-click a doc or notebook in the tree to Lock / Unlock / Remove.
- Mobile: long-press a doc or notebook to open the same menu.
- Use the overlay Unlock button when a locked document is open.
- Open plugin settings to manage locks and auto-lock behavior.

## Notes
- UI-only lock: no encryption, content is not modified.
- Disabling or uninstalling the plugin removes all restrictions immediately.

## Platforms
- Desktop and mobile are both supported.
