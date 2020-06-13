# 功能简介：
* 迅飞 语音听写 WebAPI:
* 把语音(≤60秒)转换成对应的文字信息，让机器能够“听懂”人类语言，相当于给机器安装上“耳朵”，使其具备“能听”的功能
* 语音听写流式接口，用于1分钟内的即时语音转文字技术，支持实时返回识别结果，达到一边上传音频一边获得识别文本的效果。
* 该语音能力是通过Websocket API的方式给开发者提供一个通用的接口。
* Websocket API具备流式传输能力，适用于需要流式数据传输的AI服务场景，比如边说话边识别。
* 相较于SDK，WebAPI具有轻量、跨语言的特点；相较于HTTP API，Websocket API协议有原生支持跨域的优势。
* 语音听写流式WebAPI 服务，热词使用方式：登陆开放平台https://www.xfyun.cn/后，找到控制台--我的应用---语音听写---个性化热词，上传热词。


# 使用说明：
<a target="_blank" href="https://blog.csdn.net/muguli2008/article/details/106734113" >https://blog.csdn.net/muguli2008/article/details/106734113</a>


# 实例效果：
![image](https://raw.githubusercontent.com/MuGuiLin/VoiceDictation/master/img/test.png)
![image](https://raw.githubusercontent.com/MuGuiLin/VoiceDictation/master/img/test.gif)