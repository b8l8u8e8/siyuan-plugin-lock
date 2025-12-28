- * # 🔒 Privacy Protection (SiYuan Lock)

    Provides locking mechanisms for SiYuan Note notebooks and documents. Supports password/gesture locks, auto-relock based on trusted duration, and auto-lock screen upon inactivity.

    [中文](README_zh_CN.md) | [English](README.md)

    ## ✨ Features

    - **Document/Notebook Locking**: Supports password or 3x3 gesture patterns.
    - **Locking Strategy**: Supports default lock on restart and custom auto-relock after N minutes of trusted duration.
    - **Notebook Lock Behavior**: The document tree automatically collapses and requires unlocking to expand; locked documents display a lock icon and a trust countdown (countdown display can be disabled).
    - **Document Lock Behavior**: Content is masked when opening a document; if the lock originates from a notebook (i.e., the document itself is unlocked but its parent notebook is locked), the specific notebook name is indicated.
    - **Global Search Protection**: Matched content in global search is replaced with lock hint text, retaining only the title and document path; the preview area is locked to prevent viewing locked documents via search directly.
    - **Global Search Visibility Toggle**: An "eye" button in the global search toolbar toggles whether to show or hide search results from locked documents.
    - **File History Protection**: The file history preview area is locked, requiring unlocking to view historical content, preventing unauthorized access via file history.
    - **Lock Management Panel**: The plugin settings page displays all locked objects, allowing for unlocking or deletion.
    - **Inactivity Auto-Lock Screen**: Triggers the lock screen after X minutes of no operation, with support for a floating ball/top bar countdown.

    ## 📖 Demos

    ### 1. Notebook Locking (Gesture)

    ![Notebook Locking (Gesture)](https://github.com/user-attachments/assets/ea2afc8f-90ab-435c-93ad-25f670734abb)

    ### 2. Notebook Unlocking (Gesture)

    ![Notebook Unlocking (Gesture)](https://github.com/user-attachments/assets/ef890e6d-7bb4-426a-95e6-519b64f5f2da)

    ### 3. Document Locking (Password)

    ![Document Locking (Password)](https://github.com/user-attachments/assets/3e5b01d2-05a7-482e-ae65-9068c7159659)

    ### 4. Document Unlocking (Password)

    ![Document Unlocking (Password)](https://github.com/user-attachments/assets/b8116ef5-06a5-4e5c-9edd-572fc7bcb81d)

    ### 5. Inactivity Auto-Lock Screen

    ![Auto-Lock Screen](https://github.com/user-attachments/assets/47012e8a-5dcb-4c95-bfca-47aa699ff069)

    ---

    ## ☕ Support the Author

    If you find this project helpful, your support is welcome. It encourages me to keep updating and building better tools~

    <div align="center">
        <a href="https://github.com/b8l8u8e8/siyuan-plugin-lock">
            <img src="https://img.shields.io/github/stars/b8l8u8e8/siyuan-plugin-lock?style=for-the-badge&color=ffd700&label=Give%20a%20Star" alt="Github Star">
        </a>
    </div>
    <div align="center" style="margin-top: 40px;">
        <div style="display: flex; justify-content: center; align-items: center; gap: 30px;">
            <div style="text-align: center;">
                <img src="https://github.com/user-attachments/assets/81d0a064-b760-4e97-9c9b-bf83f6cafc8a" 
                     style="height: 280px; width: auto; border-radius: 10px; border: 2px solid #07c160; object-fit: contain; display: inline-block;">
                <br/>
                <b style="color: #07c160; display: block; margin-top: 10px;">WeChat Pay</b>
            </div>
            <div style="text-align: center;">
                <img src="https://github.com/user-attachments/assets/9e1988d0-4016-4b8d-9ea6-ce8ff714ee17" 
                     style="height: 280px; width: auto; border-radius: 10px; border: 2px solid #1677ff; object-fit: contain; display: inline-block;">
                <br/>
                <b style="color: #1677ff; display: block; margin-top: 10px;">Alipay</b>
            </div>
        </div>
        <p style="margin-top: 20px;"><i>Your support is the motivation for my continuous iteration.</i></p>
    </div>

    ---

    ### 🛠️ More Info

    - **Issues / Feedback**: [GitHub Issues](https://github.com/b8l8u8e8/siyuan-plugin-lock/issues)
    - **License**: [MIT License](https://github.com/b8l8u8e8/siyuan-plugin-lock/blob/main/LICENSE)
    - **Changelog**: [CHANGELOG.md](https://github.com/b8l8u8e8/siyuan-plugin-lock/blob/main/CHANGELOG.md)
