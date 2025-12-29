# 🔒 隐私保护（SiYuan Lock）

为思源笔记的笔记本与文档提供加锁，支持密码/手势、信任时长自动重锁，以及无操作自动锁屏。

[中文](README_zh_CN.md) | [English](README.md)

## ✨ 功能介绍

- **文档/笔记本加锁**：支持密码或 3x3 手势。
- **锁定策略**：支持重启默认锁及自定义 N 分钟信任时长自动重锁。
- **笔记本锁行为**：文档树自动折叠，展开需解锁；已锁会显示锁标记与信任倒计时(倒计时设置可关闭)。
- **文档锁行为**：文档加锁对其子文档生效；打开文档时内容遮罩；文档树中锁定文档不可展开，点击展开按钮需解锁；若锁来源为上级文档/笔记本，会提示具体名称。
- **全局搜索保护**：全局搜索的匹配内容替换为锁定提示文案，只保留标题和文档路径；预览区加锁，文档自身或上级文档/笔记本加锁均会生效。
- **全局搜索隐藏开关**：全局搜索工具栏眼睛按钮切换，显示或不显示加锁的文档搜索结果。
- **文件历史保护**：文件历史预览区加锁，文档自身或上级文档/笔记本加锁时需解锁后才能查看历史内容。
- **锁管理面板**：插件设置页展示所有已加锁对象，可解锁或删除。
- **无操作自动锁屏**：无操作 X 分钟后触发锁屏，支持悬浮球/顶部栏倒计时。

## 📖 功能演示

### 1. 笔记本加锁 (手势)

![为笔记本加手势锁](https://github.com/user-attachments/assets/ea2afc8f-90ab-435c-93ad-25f670734abb)

### 2. 笔记本解锁 (手势)

![解笔记本手势锁](https://github.com/user-attachments/assets/ef890e6d-7bb4-426a-95e6-519b64f5f2da)

### 3. 文档加锁 (密码)

![为文档加密码锁](https://github.com/user-attachments/assets/3e5b01d2-05a7-482e-ae65-9068c7159659)

### 4. 文档解锁 (密码)

![解文档密码锁](https://github.com/user-attachments/assets/b8116ef5-06a5-4e5c-9edd-572fc7bcb81d)

### 5. 无操作自动锁屏

![自动锁屏](https://github.com/user-attachments/assets/47012e8a-5dcb-4c95-bfca-47aa699ff069)

---

## ☕ 支持作者

如果您认为这个项目不错，欢迎支持，这将会鼓励我持续更新，打造更好的工具~

<div align="center">
    <a href="https://github.com/b8l8u8e8/siyuan-plugin-lock">
        <img src="https://img.shields.io/github/stars/b8l8u8e8/siyuan-plugin-lock?style=for-the-badge&color=ffd700&label=%E7%BB%99%E4%B8%AAStar%E5%90%A7" alt="Github Star">
    </a>
</div>
<div align="center" style="margin-top: 40px;">
    <div style="display: flex; justify-content: center; align-items: center; gap: 30px;">
        <div style="text-align: center;">
            <img src="https://github.com/user-attachments/assets/81d0a064-b760-4e97-9c9b-bf83f6cafc8a" 
                 style="height: 280px; width: auto; border-radius: 10px; border: 2px solid #07c160; object-fit: contain; display: inline-block;">
            <br/>
            <b style="color: #07c160; display: block; margin-top: 10px;">微信支付</b>
        </div>
        <div style="text-align: center;">
            <img src="https://github.com/user-attachments/assets/9e1988d0-4016-4b8d-9ea6-ce8ff714ee17" 
                 style="height: 280px; width: auto; border-radius: 10px; border: 2px solid #1677ff; object-fit: contain; display: inline-block;">
            <br/>
            <b style="color: #1677ff; display: block; margin-top: 10px;">支付宝</b>
        </div>
    </div>
    <p style="margin-top: 20px;"><i>您的支持是我不断迭代的动力</i></p>
</div>




---

### 🛠️ 其他信息

- **问题反馈**：[GitHub Issues](https://github.com/b8l8u8e8/siyuan-plugin-lock/issues)
- **开源协议**：[MIT License](https://github.com/b8l8u8e8/siyuan-plugin-lock/blob/main/LICENSE)
- **更新日志**: [CHANGELOG.md](https://github.com/b8l8u8e8/siyuan-plugin-lock/blob/main/CHANGELOG.md)
