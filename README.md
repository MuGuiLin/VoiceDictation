# 科大讯飞 · 语音听写（流式版） WebAPI

基于科大讯飞语音听写 WebSocket API 的浏览器端封装库，支持**实时流式语音识别**，边说边出字，1 分钟内即时转写。

[![NPM](https://img.shields.io/npm/v/@muguilin/xf-voice-dictation?color=4f46e5)](https://www.npmjs.com/package/@muguilin/xf-voice-dictation)
[![License](https://img.shields.io/badge/license-MIT-green)]()

---

## 🍀 功能简介

- 🎙️ **实时流式识别** — 一边上传音频、一边获取识别文本，延迟低至毫秒级
- ⚡ **轻量跨语言** — 纯 Web API 封装，无需原生 SDK，浏览器端即开即用
- 🔗 **WebSocket 协议** — 原生支持跨域，全双工通信，比 HTTP API 更高效
- 🌐 **多语种/方言** — 支持普通话、粤语、四川话、英语等多种语言
- 🛡️ **安全鉴权** — 支持前端直连模式和服务端鉴权代理模式，生产环境推荐将凭证放在后端
- 📦 **NPM + CDN** — 支持模块化导入和 `<script>` 标签两种使用方式

---

## 🔍 在线演示

| 地址 | 说明 |
|------|------|
| [demo.muguilin.com/VoiceDictation](http://demo.muguilin.com/VoiceDictation/) | 主站演示 |
| [muguilin.github.io/VoiceDictation](https://muguilin.github.io/VoiceDictation/) | GitHub Pages 演示 |

![效果预览](https://camo.githubusercontent.com/8943c97eb6bfa4b905475206f1f1f6584cf3470a8dfc0cccd7c596cfc8f8366f/68747470733a2f2f696d672d626c6f672e6373646e696d672e636e2f32303230303631333138303635333134352e676966)

---

## 📦 安装

### 前端库

```bash
# npm
npm i @muguilin/xf-voice-dictation

# yarn
yarn add @muguilin/xf-voice-dictation
```

或者直接通过 `<script>` 标签引入：

```html
<script src="./js/crypto-js.min.js"></script>
<script src="./js/xf-voice-dictation.js"></script>
```

### 后端鉴权服务（可选，生产推荐）

```bash
cd api
npm install
# 在 .env 文件中配置凭据后启动
node server.js
```

> 后端服务负责签名生成，将 `API_SECRET` 和 `API_KEY` 保留在服务端，前端无需暴露敏感凭据。

---

## 📚 快速开始

> 首先去 [讯飞开放平台](https://www.xfyun.cn/services/voicedictation) 申请 APPID、API_SECRET、API_KEY。
>
> ⚠️ `API_SECRET` 和 `API_KEY` 长度接近，请**仔细核对**，不要填错！

### 方式一：前端直连（开发测试）

```javascript
import { XfVoiceDictation } from '@muguilin/xf-voice-dictation';

const xfVoice = new XfVoiceDictation({
    APPID: 'your_app_id',
    API_SECRET: 'your_api_secret',
    API_KEY: 'your_api_key',

    onWillStatusChange: (oldStatus, newStatus) => {
        console.log('状态变化：', oldStatus, '→', newStatus);
        // null → init → ing → end
    },

    onTextChange: (text) => {
        console.log('识别结果：', text);
    },

    onError: (error) => {
        console.error('错误：', error);
    }
});

// 开始识别
xfVoice.start();

// 停止识别
xfVoice.stop();
```

### 方式二：服务端鉴权（推荐生产环境）

将 `API_SECRET`、`API_KEY` 配置在后端 `.env` 文件中，前端通过 API 获取已签名的 WebSocket URL：

```javascript
const xfVoice = new XfVoiceDictation({
    // 由后端签名，前端无需传入 APPID / API_SECRET / API_KEY
    wsUrlProvider: () => {
        return fetch('http://localhost:666/api/xf-ws-url')
            .then(res => res.json());
        // 返回 { url: 'wss://...', appId: '...' }
    },

    onWillStatusChange: (oldStatus, newStatus) => { /* ... */ },
    onTextChange: (text) => { /* ... */ }
});
```

后端 API 端点：`GET /api/xf-ws-url` → `{ url: string, appId: string }`

---

## 📖 API 参考

### 构造参数

```javascript
const xfVoice = new XfVoiceDictation({

    // ========== 鉴权（二选一） ==========

    // 方式一：前端直连
    APPID: '',              // 讯飞应用 APPID
    API_SECRET: '',         // 讯飞 API Secret
    API_KEY: '',            // 讯飞 API Key

    // 方式二：服务端鉴权（传入了则忽略上面三项）
    wsUrlProvider: null,    // () => Promise<{ url: string, appId: string }>

    // ========== WebSocket 配置 ==========
    url: 'wss://iat-api.xfyun.cn/v2/iat',  // WebSocket 地址（一般无需修改）

    // ========== 语音参数 ==========
    language: 'zh_cn',      // 语种：zh_cn | en_us | ...
    accent: 'mandarin',     // 方言：mandarin（普通话）| cantonese（粤语）| lmz（四川话）

    // ========== 行为配置 ==========
    autoClose: true,        // 无活动时自动停止（默认开启）
    autoCloseTime: 3000,    // 自动关闭等待时间（毫秒），默认 3000
    debug: false,           // 调试模式，开启后在控制台输出详细日志
    interval: 40,           // 音频发送间隔（毫秒），默认 40
    frameSize: 1280,        // 每次发送字节数（16k 采样率 PCM，每 40ms = 1280 字节）

    // ========== 回调 ==========
    onWillStatusChange: (oldStatus, newStatus) => {},
    onTextChange: (text) => {},
    onError: (error) => {},
});
```

### 实例方法

| 方法 | 说明 |
|------|------|
| `xfVoice.start()` | 开始录音并识别 |
| `xfVoice.stop()` | 停止录音 |
| `xfVoice.getResult()` | 获取当前识别结果文本 |
| `xfVoice.destroy()` | 完全销毁实例，释放所有资源（包括 AudioContext、Worker） |
| `xfVoice.setParams({ ... })` | 动态修改参数：`language`、`accent`、`autoCloseTime`、`autoClose`、`debug`、`interval`、`frameSize` |

### 状态流转

```
null  ──start()──▶  init  ──WebSocket open──▶  ing  ──识别完成/stop()──▶  end
```

---

## 🔧 常见问题

**Q: 为什么第二次点击开始无法录音？**

A: 库已内置音频资源自动释放机制。如果遇到问题可调用 `xfVoice.destroy()` 后重新 `new` 实例。

**Q: 只能在 HTTPS 环境下使用吗？**

A: 浏览器安全策略要求麦克风权限仅在 `localhost`、`127.0.0.1` 或 `HTTPS` 环境下可用。

**Q: 支持哪些浏览器？**

A: Chrome、Edge、Firefox、Safari 等现代浏览器（需支持 Web Audio API 和 WebSocket）。

**Q: 每次识别最长多久？**

A: 讯飞接口单次最长 60 秒，超过会自动断开。通过 `autoCloseTime` 可设置无语音时的自动关闭等待时长。

**Q: 如何保护 API 凭据不泄露？**

A: 推荐使用 `wsUrlProvider` 模式，将 `API_SECRET` 和 `API_KEY` 放在服务端 `.env` 文件中，前端通过 API 获取已签名的 WebSocket URL。项目已内置 `api/server.js` 可直接使用。

---

## 🚀 相关链接

- [CSDN 博客教程](https://blog.csdn.net/muguli2008/article/details/106734113)
- [NPM 主页](https://www.npmjs.com/package/@muguilin/xf-voice-dictation)
- [讯飞开放平台](https://www.xfyun.cn/services/voicedictation)
- [讯飞鉴权签名文档](https://www.xfyun.cn/herapi/product/iat_sign)

---

## ☕ 支持作者

开源不易，如果这个项目对你有帮助，欢迎 **Star ⭐** 支持！

也可以请我喝杯咖啡，你的鼓励是我持续更新的最大动力 🙏

| 支付宝 | 微信支付 |
| :----: | :------: |
| ![支付宝](http://demo.muguilin.com/zfb-qrcode.png) | ![微信支付](http://demo.muguilin.com/wx-qrcode.png) |

---

