# 科大讯飞-语音识别（语音听写）Web API



### 🍀 功能简介：

> - 把语音(≤60秒)转换成对应的文字信息，让机器能够"听懂"人类语言，相当于给机器安装上"耳朵"，使其具备"能听"的功能。
> - 语音听写流式接口，用于1分钟内的即时语音转文字技术，支持实时返回识别结果，达到一边上传音频一边获得识别文本的效果。
> - 该语音能力是通过Websocket API的方式给开发者提供一个通用的接口。
> - Websocket API具备流式传输能力，适用于需要流式数据传输的AI服务场景，比如边说话边识别。
> - 相较于SDK，WebAPI具有轻量、跨语言的特点；相较于HTTP API，Websocket API协议有原生支持跨域的优势。
> - 语音听写流式WebAPI 服务，熱詞使用方式：[登陆讯飞开放平台](https://www.xfyun.cn/) 后，找到控制台--我的应用---语音听写---个性化热词，上传热词。



### 🔍 实例效果：

- [https://demo.muguilin.com/VoiceDictation/](https://demo.muguilin.com/VoiceDictation/)

- [https://muguilin.github.io/VoiceDictation/](https://muguilin.github.io/VoiceDictation/)

![image](https://camo.githubusercontent.com/8943c97eb6bfa4b905475206f1f1f6584cf3470a8dfc0cccd7c596cfc8f8366f/68747470733a2f2f696d672d626c6f672e6373646e696d672e636e2f32303230303631333138303635333134352e676966)



### 🏡 下载安装：

```shell
# 使用npm命令下载安装
$ npm i @muguilin/xf-voice-dictation

# 使用yarn命令下载安装
$ yarn add @muguilin/xf-voice-dictation
```



### 📚 使用方法：

> 【关于】：服务接口认证信息这 3 个参数据：APPID、APISecret、APIKey，请到官网申请（https://www.xfyun.cn/services/voicedictation）
>
> 【注意】：APISecret 和 APIKey 的长度都差不多很相似，所以不要填错哦！

```javascript
import { XfVoiceDictation } from '@muguilin/xf-voice-dictation';

let times = null;
const xfVoice = new XfVoiceDictation({
    APPID: 'xxx',
    APISecret: 'xxx',
    APIKey: 'xxx',

    // webSocket请求地址 非必传参数，默认为：wss://iat-api.xfyun.cn/v2/iat
    // url: '',

    // 监听录音状态变化回调
    onWillStatusChange: function (oldStatus, newStatus) {
        // 可以在这里进行页面中一些交互逻辑处理：注：倒计时（语音听写只有60s）,录音的动画，按钮交互等！
        console.log('识别状态：', oldStatus, newStatus);
    },

    // 监听识别结果的变化回调
    onTextChange: function (text) {
        // 可以在这里进行页面中一些交互逻辑处理：如将文本显示在页面中
        console.log('识别内容：', text);

        // 如果3秒钟内没有说话，就自动关闭（60s后也会自动关闭）
        if (text) {
            clearTimeout(times);
            times = setTimeout(() => {
                this.stop();
            }, 3000);
        }
    },

    // 监听识别错误回调
    onError: function (error) {
        console.log('错误信息：', error);
    }
});


// 给Dom元素添加事件，调用开始语音识别！
// xfVoice.start();


// 给Dom元素添加事件，调用停止语音识别！
// xfVoice.stop();
```



### 📖 API 说明：

```javascript
// 完整 API 示例
const xfVoice = new XfVoiceDictation({
    APPID: 'your_app_id',
    APISecret: 'your_api_secret',
    APIKey: 'your_api_key',

    // 语种（默认：zh_cn）
    language: 'zh_c n',  // 英文：en_us

    // 方言（默认：mandarin）
    accent: 'mandarin',  // 粤语：cantonese，四川话：lmz

    // 自动关闭时间（毫秒），默认3秒无活动自动关闭
    autoCloseTime: 3000,

    // 是否启用自动关闭（默认：true）
    autoClose: true,

    // 调试模式（默认：false）
    debug: false,

    // 监听录音状态变化回调
    onWillStatusChange: (oldStatus, newStatus) => {
        // oldStatus: null -> init -> ing -> end
        console.log('状态变化：', oldStatus, '->', newStatus);
    },

    // 监听识别结果变化回调
    onTextChange: (text) => {
        console.log('识别结果：', text);
    },

    // 监听错误回调
    onError: (error) => {
        console.error('错误：', error);
    }
});

// 开始录音
xfVoice.start();

// 停止录音
xfVoice.stop();

// 获取当前识别结果
const result = xfVoice.getResult();
console.log('最终结果：', result);

// 完全重置（释放所有资源，销毁实例）
xfVoice.destroy();
```



### 🔧 常见问题：

**Q: 为什么第二次点击开始无法录音？**
> A: 库已内置音频资源自动释放机制，确保每次停止后正确释放。如果需要手动重置可调用 `xfVoice.destroy()` 后重新创建实例。

**Q: 只能在 HTTPS 环境下使用吗？**
> A: 为了安全起见，浏览器要求在 `localhost`、`127.0.0.1` 或 `HTTPS` 环境下才能获取麦克风权限。

**Q: 支持哪些浏览器？**
> A: 支持 Chrome、Edge、Firefox、Safari 等现代浏览器（需支持 Web Audio API 和 WebSocket）。

**Q: 状态流转顺序是怎样的？**
> A: `null` → `init` → `ing` → `end`



### 🚀 使用说明：

- [我的博客](http://www.muguilin.com/blog/info/609bafc50d572b3fd79b058f)

- [CSDN 博客](https://blog.csdn.net/muguli2008/article/details/106734113)

- [NPM 主页](https://www.npmjs.com/package/@muguilin/xf-voice-dictation)