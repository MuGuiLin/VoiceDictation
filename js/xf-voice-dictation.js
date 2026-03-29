; (function (window, voice) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(voice);
    } else if (typeof exports === 'object') {
        module.exports = voice();
    } else {
        window.XfVoiceDictation = voice();
    };
}(typeof window !== "undefined" ? window : this, () => {
    "use strict";
    return class IatRecorder {
        constructor(opts = {}) {
            // 服务接口认证信息(语音听写（流式版）WebAPI)
            this.APPID = opts.APPID || '';
            this.APISecret = opts.APISecret || '';
            this.APIKey = opts.APIKey || '';

            // webSocket请求地址
            this.url = opts.url || "wss://iat-api.xfyun.cn/v2/iat";
            this.host = opts.host || "iat-api.xfyun.cn";

            // 识别监听方法
            this.onTextChange = opts.onTextChange || Function();
            this.onWillStatusChange = opts.onWillStatusChange || Function();
            this.onError = opts.onError || Function();

            // 方言/语种
            this.status = 'null';
            this.language = opts.language || 'zh_cn';
            this.accent = opts.accent || 'mandarin';

            // 流媒体
            this.streamRef = null;
            // 记录音频数据
            this.audioData = [];
            // 记录听写结果
            this.resultText = '';
            // wpgs下的听写结果需要中间状态辅助记录
            this.resultTextTemp = '';
            // 音频数据多线程
            this.handlerInterval = null;
            this.webSocket = null;
            this.audioContext = null;
            this.webWorker = null;
            this.scriptProcessor = null;
            this.mediaSource = null;
            // 自动关闭时间（毫秒），默认3秒无活动自动关闭
            this.autoCloseTime = opts.autoCloseTime || 3000;
            // 是否启用自动关闭
            this.autoClose = opts.autoClose !== false;
            // 内部计时器
            this.autoCloseTimer = null;
            // 是否已初始化过（用于区分首次和后续启动）
            this.hasInited = false;
            // 调试模式
            this.debug = opts.debug || false;
            // 音频发送间隔（毫秒），讯飞文档建议40ms
            this.interval = opts.interval || 40;
            // 每次发送的字节数，16k采样率PCM每40ms为1280字节
            this.frameSize = opts.frameSize || 1280;
            // 初始化
            this.init();
        }

        // 调试日志
        log(...args) {
            if (this.debug) {
                console.log('[XfVoiceDictation]', ...args);
            }
        }

        // 获取webSocket请求地址鉴权
        getWebSocketUrl() {
            return new Promise((resolve, reject) => {
                const { url, host, APISecret, APIKey } = this;
                try {
                    const CryptoJS = require('crypto-js');
                    const result = this.generateAuthParams(url, host, APISecret, APIKey);
                    resolve(result);
                } catch (error) {
                    // 浏览器环境，使用全局CryptoJS
                    const result = this.generateAuthParams(url, host, APISecret, APIKey);
                    resolve(result);
                }
            });
        }

        // 生成鉴权参数
        generateAuthParams(url, host, APISecret, APIKey) {
            const date = new Date().toUTCString();
            const algorithm = 'hmac-sha256';
            const headers = 'host date request-line';
            const signatureOrigin = `host: ${host}\ndate: ${date}\nGET /v2/iat HTTP/1.1`;
            const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, APISecret);
            const signature = CryptoJS.enc.Base64.stringify(signatureSha);
            const authorizationOrigin = `api_key="${APIKey}", algorithm="${algorithm}", headers="${headers}", signature="${signature}"`;
            const authorization = btoa(authorizationOrigin);
            return `${url}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${host}`;
        }

        // 操作初始化
        init() {
            const self = this;
            try {
                if (!self.APPID || !self.APIKey || !self.APISecret) {
                    console.warn('[XfVoiceDictation] 请正确配置【讯飞语音听写（流式版）WebAPI】服务接口认证信息！');
                    self.onError && self.onError({ code: -1, message: '请正确配置APPID、APIKey、APISecret' });
                    return;
                } else {
                    self.webWorker = new Worker('./js/transcode.worker.js');
                    self.webWorker.onmessage = function (event) {
                        self.audioData.push(...event.data);
                    };
                }
            } catch (error) {
                console.error('[XfVoiceDictation] 请在服务器环境下运行！', error);
                self.onError && self.onError({ code: -2, message: '请在服务器环境下运行' });
            };
        }

        // 修改录音听写状态
        setStatus(status) {
            if (this.status !== status) {
                this.onWillStatusChange && this.onWillStatusChange(this.status, status);
                this.status = status;
            }
        }

        // 设置识别结果内容
        setResultText({ resultText, resultTextTemp } = {}) {
            this.onTextChange && this.onTextChange(resultTextTemp || resultText || '');
            resultText !== undefined && (this.resultText = resultText);
            resultTextTemp !== undefined && (this.resultTextTemp = resultTextTemp);
        }

        // 修改听写参数
        setParams({ language, accent, autoCloseTime, autoClose, debug, interval, frameSize } = {}) {
            language && (this.language = language);
            accent && (this.accent = accent);
            autoCloseTime !== undefined && (this.autoCloseTime = autoCloseTime);
            autoClose !== undefined && (this.autoClose = autoClose);
            debug !== undefined && (this.debug = debug);
            interval && (this.interval = interval);
            frameSize && (this.frameSize = frameSize);
        }

        // 对处理后的音频数据进行base64编码
        toBase64(buffer) {
            let binary = '';
            let bytes = new Uint8Array(buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }

        // 连接WebSocket
        connectWebSocket() {
            return this.getWebSocketUrl().then(url => {
                let iatWS;
                if ('WebSocket' in window) {
                    iatWS = new WebSocket(url);
                } else if ('MozWebSocket' in window) {
                    // Firefox兼容
                    iatWS = new MozWebSocket(url);
                } else {
                    const error = { code: -3, message: '浏览器不支持WebSocket!' };
                    this.onError && this.onError(error);
                    return false;
                }
                this.webSocket = iatWS;
                this.setStatus('init');
                iatWS.onopen = e => {
                    this.setStatus('ing');
                    // 重新开始录音
                    setTimeout(() => {
                        this.webSocketSend();
                    }, 500);
                };
                iatWS.onmessage = e => {
                    this.webSocketRes(e.data);
                };
                iatWS.onerror = e => {
                    this.log('WebSocket error:', e);
                    const error = { code: -4, message: 'WebSocket连接错误' };
                    this.onError && this.onError(error);
                    this.recorderStop(e);
                };
                iatWS.onclose = e => {
                    this.log('WebSocket closed:', e.code, e.reason);
                    this.recorderStop(e);
                };
            });
        }

        // 初始化浏览器录音
        recorderInit() {
            const self = this;
            // 创建音频环境 - 兼容Firefox和其他浏览器
            const AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;
            if (!AudioContext) {
                const error = { code: -5, message: '浏览器不支持webAudioApi相关接口' };
                this.onError && this.onError(error);
                return false;
            }
            try {
                this.audioContext = this.audioContext ? this.audioContext : new AudioContext();
                this.audioContext.resume();
            } catch (e) {
                const error = { code: -5, message: '浏览器不支持webAudioApi相关接口' };
                this.onError && this.onError(error);
                return false;
            }

            // 获取浏览器录音权限成功时回调
            let getMediaSuccess = () => {
                // 创建一个用于通过JavaScript直接处理音频
                this.scriptProcessor = this.audioContext.createScriptProcessor(0, 1, 1);
                this.scriptProcessor.onaudioprocess = e => {
                    if (this.status === 'ing') {
                        // 多线程音频数据处理
                        try {
                            this.webWorker.postMessage(e.inputBuffer.getChannelData(0));
                        } catch (error) {
                            self.log('Audio process error:', error);
                        }
                    }
                };
                // 创建一个新的MediaStreamAudioSourceNode对象
                this.mediaSource = this.audioContext.createMediaStreamSource(this.streamRef);
                this.mediaSource.connect(this.scriptProcessor);
                this.scriptProcessor.connect(this.audioContext.destination);
                this.connectWebSocket();
            };

            // 获取浏览器录音权限失败时回调
            let getMediaFail = (e) => {
                this.log('Get media fail:', e);
                const error = { code: -6, message: '录音权限获取失败' };
                this.onError && this.onError(error);
                this.audioContext && this.audioContext.close();
                this.audioContext = null;
                // 关闭websocket
                if (this.webSocket && this.webSocket.readyState === 1) {
                    this.webSocket.close();
                }
            };

            // 获取UserMedia - 兼容不同浏览器
            const getUserMedia = navigator.getUserMedia ||
                navigator.webkitGetUserMedia ||
                navigator.mozGetUserMedia ||
                navigator.msGetUserMedia;

            if (!getUserMedia) {
                if (navigator.userAgent.toLowerCase().match(/chrome/) && location.origin.indexOf('https://') < 0) {
                    const error = { code: -7, message: '获取浏览器录音功能，因安全性问题，需要在localhost或127.0.0.1或https下才能获取权限！' };
                    this.onError && this.onError(error);
                } else {
                    const error = { code: -8, message: '未识别到录音设备！' };
                    this.onError && this.onError(error);
                }
                this.audioContext && this.audioContext.close();
                this.audioContext = null;
                return false;
            }

            // 获取浏览器录音权限
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                navigator.mediaDevices.getUserMedia({
                    audio: true
                }).then(stream => {
                    self.streamRef = stream;
                    getMediaSuccess();
                }).catch(e => {
                    getMediaFail(e);
                });
            } else {
                getUserMedia.call(navigator, {
                    audio: true
                }, (stream) => {
                    self.streamRef = stream;
                    getMediaSuccess();
                }, (e) => {
                    getMediaFail(e);
                });
            }
        }

        // 向webSocket发送数据
        webSocketSend() {
            if (this.webSocket.readyState !== 1) return false;

            const { frameSize } = this;
            const audioData = this.audioData.splice(0, frameSize);

            // 首次发送需要带common和business参数
            const isFirstFrame = this.handlerInterval === null;

            const params = {
                common: isFirstFrame ? { app_id: this.APPID } : undefined,
                business: isFirstFrame ? {
                    language: this.language,
                    domain: 'iat',
                    accent: this.accent,
                    vad_eos: 5000,
                    dwa: 'wpgs'
                } : undefined,
                data: {
                    status: isFirstFrame ? 0 : (this.audioData.length === 0 ? 2 : 1),
                    format: 'audio/L16;rate=16000',
                    encoding: 'raw',
                    audio: this.toBase64(audioData)
                }
            };

            // 移除undefined字段
            if (!params.common) delete params.common;
            if (!params.business) delete params.business;

            this.webSocket.send(JSON.stringify(params));

            // 设置定时发送后续音频帧
            this.handlerInterval = setInterval(() => {
                // websocket未连接
                if (this.webSocket.readyState !== 1) {
                    this.audioData = [];
                    clearInterval(this.handlerInterval);
                    this.handlerInterval = null;
                    return false;
                }

                // 无音频数据
                if (this.audioData.length === 0) {
                    if (this.status === 'end') {
                        // 发送结束帧
                        this.webSocket.send(JSON.stringify({
                            data: {
                                status: 2,
                                format: 'audio/L16;rate=16000',
                                encoding: 'raw',
                                audio: ''
                            }
                        }));
                        this.audioData = [];
                        clearInterval(this.handlerInterval);
                        this.handlerInterval = null;
                    }
                    return false;
                }

                // 发送中间帧
                this.webSocket.send(JSON.stringify({
                    data: {
                        status: 1,
                        format: 'audio/L16;rate=16000',
                        encoding: 'raw',
                        audio: this.toBase64(this.audioData.splice(0, frameSize))
                    }
                }));

                // 重置自动关闭计时器
                if (this.autoClose && this.autoCloseTimer) {
                    clearTimeout(this.autoCloseTimer);
                    this.autoCloseTimer = setTimeout(() => {
                        this.log('自动关闭录音（无活动 ' + this.autoCloseTime + 'ms）');
                        this.stop();
                    }, this.autoCloseTime);
                }
            }, this.interval);
        }

        // 识别结束 webSocket返回数据
        webSocketRes(resultData) {
            try {
                const jsonData = JSON.parse(resultData);
                if (jsonData.code !== 0) {
                    this.log('Error:', jsonData.code, jsonData.message);
                    const error = { code: jsonData.code, message: jsonData.message };
                    this.onError && this.onError(error);
                    this.webSocket.close();
                    return;
                }

                if (jsonData.data && jsonData.data.result) {
                    const data = jsonData.data.result;
                    let str = '';
                    const ws = data.ws;
                    if (ws && ws.length > 0) {
                        for (let i = 0; i < ws.length; i++) {
                            str += ws[i].cw[0].w;
                        }
                    }

                    // 开启wpgs会有此字段(前提：已开通动态修正功能)
                    if (data.pgs) {
                        if (data.pgs === 'apd') {
                            this.setResultText({ resultText: this.resultTextTemp });
                        }
                        this.setResultText({ resultTextTemp: this.resultText + str });
                    } else {
                        this.setResultText({ resultText: this.resultText + str });
                    }

                    // 重置自动关闭计时器（有识别结果表示正在说话）
                    if (this.autoClose && str) {
                        clearTimeout(this.autoCloseTimer);
                        this.autoCloseTimer = setTimeout(() => {
                            this.log('自动关闭录音（无活动 ' + this.autoCloseTime + 'ms）');
                            this.stop();
                        }, this.autoCloseTime);
                    }
                }

                // 识别完成
                if (jsonData.data && jsonData.data.status === 2) {
                    this.setStatus('end');
                    this.webSocket.close();
                }
            } catch (error) {
                this.log('Parse result error:', error);
            }
        }

        // 启动录音
        recorderStart() {
            // 每次启动都需要完整的初始化流程（重建音频节点）
            // 先清理之前的资源
            if (this.streamRef || this.scriptProcessor || this.mediaSource) {
                this.stopRecordingOnly();
            }

            // 重新初始化
            this.recorderInit();
            this.hasInited = true;

            // 清除之前的结果
            this.setResultText({ resultText: '', resultTextTemp: '' });
        }

        // 仅停止录音不停用AudioContext（用于重新启动）
        stopRecordingOnly() {
            // 断开音频节点连接
            if (this.scriptProcessor) {
                try {
                    this.scriptProcessor.disconnect();
                } catch (e) {
                    this.log('Disconnect scriptProcessor error:', e);
                }
                this.scriptProcessor = null;
            }
            if (this.mediaSource) {
                try {
                    this.mediaSource.disconnect();
                } catch (e) {
                    this.log('Disconnect mediaSource error:', e);
                }
                this.mediaSource = null;
            }

            // 停止音频流
            if (this.streamRef) {
                try {
                    this.streamRef.getTracks().forEach(track => track.stop());
                } catch (e) {
                    this.log('Stop tracks error:', e);
                }
                this.streamRef = null;
            }

            // 清除定时器
            if (this.handlerInterval) {
                clearInterval(this.handlerInterval);
                this.handlerInterval = null;
            }
            if (this.autoCloseTimer) {
                clearTimeout(this.autoCloseTimer);
                this.autoCloseTimer = null;
            }

            // 清除音频数据
            this.audioData = [];

            this.setStatus('end');
        }

        // 停止录音
        recorderStop(e) {
            // 断开音频节点连接
            if (this.scriptProcessor) {
                try {
                    this.scriptProcessor.disconnect();
                } catch (e) {
                    this.log('Disconnect scriptProcessor error:', e);
                }
                this.scriptProcessor = null;
            }
            if (this.mediaSource) {
                try {
                    this.mediaSource.disconnect();
                } catch (e) {
                    this.log('Disconnect mediaSource error:', e);
                }
                this.mediaSource = null;
            }

            // Safari下suspend后再次resume录音内容将是空白
            const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
            if (!isSafari) {
                if (this.audioContext && this.audioContext.state !== 'suspended') {
                    this.audioContext.suspend();
                }
            }

            // 停止WebSocket
            if (this.webSocket && this.webSocket.readyState === 1) {
                this.webSocket.close();
                this.webSocket = null;
            }

            // 停止音频流
            if (this.streamRef) {
                try {
                    this.streamRef.getTracks().forEach(track => track.stop());
                } catch (err) {
                    this.log('Stop stream error:', err);
                }
                this.streamRef = null;
            }

            // 清除定时器
            if (this.handlerInterval) {
                clearInterval(this.handlerInterval);
                this.handlerInterval = null;
            }
            if (this.autoCloseTimer) {
                clearTimeout(this.autoCloseTimer);
                this.autoCloseTimer = null;
            }

            // 清除音频数据
            this.audioData = [];

            this.setStatus('end');
        }

        // 完全重置（释放所有资源）
        reset() {
            this.recorderStop();
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            if (this.webWorker) {
                this.webWorker.terminate();
                this.webWorker = null;
            }
            this.scriptProcessor = null;
            this.mediaSource = null;
            this.hasInited = false;
            this.resultText = '';
            this.resultTextTemp = '';
        }

        // 开始录音（对外API）
        start() {
            this.recorderStart();
        }

        // 停止录音（对外API）
        stop() {
            this.recorderStop();
        }

        // 完全重置（对外API）
        destroy() {
            this.reset();
        }

        // 获取当前识别结果
        getResult() {
            return this.resultText || this.resultTextTemp || '';
        }
    };
}));