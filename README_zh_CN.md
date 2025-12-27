# 隐私保护（SiYuan Lock）

为思源笔记的笔记本与文档提供加锁，支持密码/手势、信任时长自动重锁，以及无操作自动锁屏。

[中文](README_zh_CN.md)|[English](README.md)

## 功能介绍
- 文档/笔记本加锁：密码或 3x3 手势。
- 锁定策略：
  - 重启默认锁：解锁后仅本次会话有效，重启后重新上锁。
  - 信任时长：解锁后保持 N 分钟，时间到自动重锁。
- 笔记本锁行为：
  - 文档树中自动折叠。
  - 展开时需要解锁验证。
  - 仅作用于笔记本本身，笔记本内文档互不影响。
- 文档锁行为：
  - 文档可打开，但内容区域会被锁屏遮罩覆盖。
  - 点击遮罩的解锁按钮后可查看内容。
- 文档树标记：
  - 锁定项显示锁图标；解锁后显示解锁图标，方便区分曾经加锁的项目。
  - 信任时长锁仅在信任有效期内显示倒计时（可在设置中关闭）。
- 无操作自动锁屏：
  - 无操作 X 分钟后触发思源自带锁屏/登出。
  - 可选显示倒计时（顶部栏或悬浮球）。
  - 悬浮球可拖拽，位置按设备以比例保存，适配不同布局。
- 设置面板：
  - 列表展示所有锁（类型、锁类型、策略、到期时间/剩余时间）。
  - 支持在设置中直接解锁或移除锁。
  - 配置自动锁屏与倒计时显示位置。
  - 开关“文档树信任倒计时”显示。

## 使用方法
- 桌面端：在文档树中右键文档/笔记本，选择加锁/解锁/移除锁。
- 移动端：点击文档/笔记本右边的三点弹出同样的菜单。
- 打开已锁文档时，点击遮罩中的“解锁”按钮进行验证。
- 插件设置中可统一管理所有锁与自动锁屏设置。

### 为笔记本加手势锁

![GIF](https://github.com/user-attachments/assets/ea2afc8f-90ab-435c-93ad-25f670734abb)

### 解笔记本手势锁

![GIF](https://github.com/user-attachments/assets/ef890e6d-7bb4-426a-95e6-519b64f5f2da)

### 为文档加密码锁

![GIF](https://github.com/user-attachments/assets/3e5b01d2-05a7-482e-ae65-9068c7159659)

### 解文档密码锁

![GIF](https://github.com/user-attachments/assets/b8116ef5-06a5-4e5c-9edd-572fc7bcb81d)

### 自动锁屏

![GIF](https://github.com/user-attachments/assets/47012e8a-5dcb-4c95-bfca-47aa699ff069)

## 说明
### 更新日志

- 详见 [CHANGELOG.md](https://github.com/b8l8u8e8/siyuan-plugin-lock/blob/main/CHANGELOG.md)

### 问题反馈

- 如果有问题，可以去提 [issue](https://github.com/b8l8u8e8/siyuan-plugin-lock/issues)

### 支持作者

如果您认为这个项目不错，欢迎支持，这将会鼓励我持续更新，打造更好的工具~

#### Github Star

给个[Github Star](https://github.com/b8l8u8e8/siyuan-plugin-lock)支持作者吧~

#### 微信
![微信](https://github.com/user-attachments/assets/81d0a064-b760-4e97-9c9b-bf83f6cafc8a)

#### 支付宝
![支付宝](https://github.com/user-attachments/assets/9e1988d0-4016-4b8d-9ea6-ce8ff714ee17)

### 许可证

- MIT
