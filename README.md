# 科大迅飞-语音识别（语音听写）Web API 

### 🍀功能简介：

> - 把语音(≤60秒)转换成对应的文字信息，让机器能够“听懂”人类语言，相当于给机器安装上“耳朵”，使其具备“能听”的功能。
> - 语音听写流式接口，用于1分钟内的即时语音转文字技术，支持实时返回识别结果，达到一边上传音频一边获得识别文本的效果。
> - 该语音能力是通过Websocket API的方式给开发者提供一个通用的接口。
> - Websocket API具备流式传输能力，适用于需要流式数据传输的AI服务场景，比如边说话边识别。
> - 相较于SDK，WebAPI具有轻量、跨语言的特点；相较于HTTP API，Websocket API协议有原生支持跨域的优势。
> - 语音听写流式WebAPI 服务，热词使用方式：<a target="_blank" href="https://www.xfyun.cn" >登陆迅飞开放平台</a>后，找到控制台--我的应用---语音听写---个性化热词，上传热词。



### 🔍实例效果：

- #### [https://demo.muguilin.com/VoiceDictation/](https://demo.muguilin.com/VoiceDictation/)

- [https://muguilin.github.io/VoiceDictation/](https://muguilin.github.io/VoiceDictation/)

![image](https://img-blog.csdnimg.cn/20200613180653145.gif)



#### 🏡 下载安装：

```shell
# 使用npm命令下载安装
$ npm i @muguilin/xf-voice-dictation

# 使用yarn命令下载安装
$ yarn add @muguilin/xf-voice-dictation
```



#### 📚 使用方法：

> 【关于】：服务接口认证信息这 3 个参数据：APPID、APISecret、APIKey，请到官网申请（https://www.xfyun.cn/services/voicedictation）
>
> 【注意】：APISecret 和 APIKey 的长度都差不多很相似，所以要填错哦！

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
        console.log('识别内容：',text)

        // 如果3秒钟内没有说话，就自动关闭（60s后也会自动关闭）
        if (text) {
            clearTimeout(times);
            times = setTimeout(() => {
                this.stop();
            }, 3000);
        };
    },

    // 监听识别错误回调
    onError: function(error){
        console.log('错误信息：', error)
    }
});


// 给Dom元素加添事件，来调用开始语音识别！
// xfVoice.start();


// 给Dom元素加添事件，来调用关闭语音识别！
// xfVoice.stop();
```



### 🚀使用说明：

- #### [http://www.muguilin.com/blog](http://www.muguilin.com/blog/info/609bafc50d572b3fd79b058f)

- #### [https://blog.csdn.net/muguli2008](https://blog.csdn.net/muguli2008/article/details/106734113)

- [@muguilin/xf-voice-dictation (npmjs.com)](https://www.npmjs.com/package/@muguilin/xf-voice-dictation)

