# 🔒 SiYuan Lock

Provide locking for notebooks and documents in SiYuan Note. Supports Password/Gesture, Trust Duration (Auto-Relock), and Idle Auto-Lock.

[English](README.md) | [中文](README_zh_CN.md)

## ✨ Features

* **Notebook/Document Locking**: Secure your content with a Text Password or a 3x3 Gesture Pattern.
* **Locking Strategies**:
    * **Relock on Restart**: Unlock once per session; relocks automatically when the app restarts.
    * **Trust Duration**: Stays unlocked for $N$ minutes, then automatically relocks.
* **Notebook Lock Behavior**: Locked items are automatically collapsed in the Doc Tree; expanding them requires verification.
* **Document Lock Behavior**: Documents can be opened, but content is hidden by a lock-screen overlay. Click the "Unlock" button to view.
* **Idle Auto-Lock**: Automatically triggers SiYuan's system lock/logout after $X$ minutes of inactivity, with an optional countdown timer (Top Bar or Floating Ball).

## 📖 Demonstrations

### 1. Lock Notebook (Gesture)
![Lock Notebook](https://github.com/user-attachments/assets/ea2afc8f-90ab-435c-93ad-25f670734abb)

### 2. Unlock Notebook (Gesture)
![Unlock Notebook](https://github.com/user-attachments/assets/ef890e6d-7bb4-426a-95e6-519b64f5f2da)

### 3. Lock Document (Password)
![Lock Document](https://github.com/user-attachments/assets/3e5b01d2-05a7-482e-ae65-9068c7159659)

### 4. Unlock Document (Password)
![Unlock Document](https://github.com/user-attachments/assets/b8116ef5-06a5-4e5c-9edd-572fc7bcb81d)

### 5. Idle Auto-Lock
![Idle Auto-Lock](https://github.com/user-attachments/assets/47012e8a-5dcb-4c95-bfca-47aa699ff069)

---

## ☕ Support Me

If you find this plugin helpful, please consider supporting its development!

<div align="center">
    <a href="https://github.com/b8l8u8e8/siyuan-plugin-lock">
        <img src="https://img.shields.io/github/stars/b8l8u8e8/siyuan-plugin-lock?style=for-the-badge&color=ffd700&label=Give%20me%20a%20Star" alt="Github Star">
    </a>
</div>

<br/>

<div align="center">
    <div style="display: flex; justify-content: center; align-items: flex-end; gap: 30px;">
        <div style="text-align: center;">
            <img src="https://github.com/user-attachments/assets/81d0a064-b760-4e97-9c9b-bf83f6cafc8a" height="280" style="border-radius: 10px; border: 2px solid #07c160; object-fit: contain;"><br/>
            <b style="color: #07c160; display: block; margin-top: 10px;">WeChat Pay</b>
        </div>
        <div style="text-align: center;">
            <img src="https://github.com/user-attachments/assets/9e1988d0-4016-4b8d-9ea6-ce8ff714ee17" height="280" style="border-radius: 10px; border: 2px solid #1677ff; object-fit: contain;"><br/>
            <b style="color: #1677ff; display: block; margin-top: 10px;">Alipay</b>
        </div>
    </div>
    <p style="margin-top: 20px;"><i>Your support is the motivation for my continuous updates.</i></p>
</div>

---

### 🛠️ More Info
- **Feedback**: [GitHub Issues](https://github.com/b8l8u8e8/siyuan-plugin-lock/issues)
- **License**: [MIT License](https://github.com/b8l8u8e8/siyuan-plugin-lock/blob/main/LICENSE)
