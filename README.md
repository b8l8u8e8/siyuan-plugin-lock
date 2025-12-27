- # Privacy Protection (SiYuan Lock)

  Provides locking for notebooks and documents in SiYuan Notes, supporting password/gesture locks, auto-relocking based on trust duration, and automatic screen lock after inactivity.

  [中文](README_zh_CN.md)|[English](README.md)

  ## Features
  - Document/Notebook Lock: Password or 3x3 Gesture.
  - Locking Policies:
    - Restart Default Lock: After unlocking, it is only valid for the current session; the document will be locked again after restarting.
    - Trust Duration: Keeps unlocked for N minutes after unlocking, automatically relocks when the time expires.
  - Notebook Lock Behavior:
    - Automatically folds in the document tree.
    - Requires unlock verification to expand.
    - Only applies to the notebook itself; documents within the notebook are not affected.
  - Document Lock Behavior:
    - The document can be opened, but the content area will be covered by a lock screen.
    - Clicking the unlock button on the mask allows access to the content.
  - Document Tree Marking:
    - Locked items display a lock icon; after unlocking, an unlock icon is shown for easy differentiation of previously locked items.
    - Trust duration lock shows a countdown only within the trust period (can be disabled in settings).
  - Inactivity Auto Lock:
    - Triggers SiYuan’s built-in lock/logout after X minutes of inactivity.
    - Optional countdown display (top bar or floating ball).
    - The floating ball is draggable, and its position is saved proportionally based on the device, adapting to different layouts.
  - Settings Panel:
    - Lists all locks (type, lock type, policy, expiration time/remaining time).
    - Supports unlocking or removing locks directly from the settings.
    - Configures automatic screen lock and countdown display position.
    - Switch for "Document Tree Trust Countdown" display.

  ## Usage
  - Desktop: Right-click a document/notebook in the document tree, and select Lock/Unlock/Remove Lock.
  - Mobile: Click the three dots on the right side of the document/notebook to open the same menu.
  - When opening a locked document, click the "Unlock" button on the mask for verification.
  - Plugin settings allow you to manage all locks and automatic screen lock settings.

  ### Lock Notebook with Gesture

  ![GIF](https://github.com/user-attachments/assets/ea2afc8f-90ab-435c-93ad-25f670734abb)

  ### Unlock Notebook Gesture

  ![GIF](https://github.com/user-attachments/assets/ef890e6d-7bb4-426a-95e6-519b64f5f2da)

  ### Lock Document with Password

  ![GIF](https://github.com/user-attachments/assets/3e5b01d2-05a7-482e-ae65-9068c7159659)

  ### Unlock Document Password Lock

  ![GIF](https://github.com/user-attachments/assets/b8116ef5-06a5-4e5c-9edd-572fc7bcb81d)

  ### Automatic Screen Lock

  ![GIF](https://github.com/user-attachments/assets/47012e8a-5dcb-4c95-bfca-47aa699ff069)

  ## Notes
  ### Changelog

  - See [CHANGELOG.md](https://github.com/b8l8u8e8/siyuan-plugin-lock/blob/main/CHANGELOG.md)

  ### Issue Feedback

  - If you encounter any issues, please [submit an issue](https://github.com/b8l8u8e8/siyuan-plugin-lock/issues)

  ### Support the Author

  If you think this project is useful, feel free to support it. This will encourage me to keep updating and building better tools~

  #### Github Star

  Give a [Github Star](https://github.com/b8l8u8e8/siyuan-plugin-lock) to support the author~

  #### WeChat
  ![WeChat](https://github.com/user-attachments/assets/81d0a064-b760-4e97-9c9b-bf83f6cafc8a)

  #### Alipay
  ![Alipay](https://github.com/user-attachments/assets/9e1988d0-4016-4b8d-9ea6-ce8ff714ee17)

  ### License

  - MIT
