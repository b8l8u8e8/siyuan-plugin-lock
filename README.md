# SiYuan Lock (Privacy Guard)

Protect notebooks and documents with UI locks (password or gesture). Supports trust-time unlock, idle auto-lock, and clear lock indicators in the doc tree.
## Feature Preview

### Plugin Settings Interface
<img width="1419" height="775" alt="image" src="https://github.com/user-attachments/assets/082a458b-911b-4af8-a4de-21b0e27069ad" />

### Add a Gesture Lock to a Notebook
![GIF](https://github.com/user-attachments/assets/ea2afc8f-90ab-435c-93ad-25f670734abb)

### Unlock a Notebook Gesture Lock
![GIF](https://github.com/user-attachments/assets/ef890e6d-7bb4-426a-95e6-519b64f5f2da)

### Add a Password Lock to a Document
![GIF](https://github.com/user-attachments/assets/3e5b01d2-05a7-482e-ae65-9068c7159659)

### Unlock a Document Password Lock
![GIF](https://github.com/user-attachments/assets/b8116ef5-06a5-4e5c-9edd-572fc7bcb81d)

### Automatic Screen Lock
![GIF](https://github.com/user-attachments/assets/47012e8a-5dcb-4c95-bfca-47aa699ff069)

## Features
- Lock notebooks and documents with password or 3x3 pattern .
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
  - Lock icon shown for locked items; unlock icon shown after unlock to indicate it was previously locked.
  - Trust-time locks show a live countdown only while trust is active (toggle in settings).
- Idle auto-lock:
  - After X minutes of no activity, triggers SiYuan's lock screen/logout.
  - Optional countdown display (top bar or floating bubble).
  - Floating bubble is draggable; position is saved per device by ratio to adapt to different layouts.
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

## Changelog
- See [CHANGELOG.md](https://github.com/b8l8u8e8/siyuan-plugin-lock/blob/main/CHANGELOG.md).

## License
- MIT.
