/**
 * 讯飞语音听写（流式版）WebAPI — 后端鉴权服务
 *
 * 将 APISecret / APIKey 保留在服务端，前端通过此接口获取已签名的 WebSocket URL，
 * 避免敏感凭证暴露在浏览器端代码中。
 *
 * 启动方式:
 *   先在 .env 文件中配置好 APPID / API_SECRET / API_KEY，然后：
 *   node server.js
 *
 * 前端访问: http://localhost:666
 * API 端点: GET /api/xf-ws-url → { url: "wss://...", appId: "..." }
 */

// 加载 .env 文件中的环境变量
require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();

// CORS（允许前后端分离部署）
app.use(cors());

// 提供静态文件服务（index.html、js/、css/、img/ 等）
app.use(express.static(__dirname));

// ---------------------------------------------------------------------------
// 配置（仅从环境变量读取，不设默认值，避免凭证意外泄露到仓库）
// ---------------------------------------------------------------------------
const APPID = process.env.APPID || '';
const API_SECRET = process.env.API_SECRET || '';
const API_KEY = process.env.API_KEY || '';

const HOST = 'iat-api.xfyun.cn';
const WS_URL = 'wss://iat-api.xfyun.cn/v2/iat';

// ---------------------------------------------------------------------------
// GET /api/xf-ws-url
// 生成与前端 getWebSocketUrl() 完全等价的已鉴权 WebSocket 地址
// ---------------------------------------------------------------------------
app.get('/api/xf-ws-url', (_req, res) => {
    if (!APPID || !API_SECRET || !API_KEY) {
        return res.status(500).json({
            error: '服务端凭证未配置，请设置环境变量 APPID、API_SECRET、API_KEY。'
        });
    }

    try {
        // 1. 构造签名原文（与前端 generateAuthParams 保持一致）
        const date = new Date().toUTCString();
        const signatureOrigin = `host: ${HOST}\ndate: ${date}\nGET /v2/iat HTTP/1.1`;

        // 2. HMAC-SHA256 签名 → Base64
        const hmac = crypto.createHmac('sha256', API_SECRET);
        hmac.update(signatureOrigin);
        const signature = hmac.digest('base64');

        // 3. 拼接 authorization 原始串
        const authorizationOrigin =
            `api_key="${API_KEY}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;

        // 4. Base64 编码（等价于浏览器 btoa）
        const authorization = Buffer.from(authorizationOrigin).toString('base64');

        // 5. 组装最终 URL
        const url =
            `${WS_URL}?authorization=${authorization}&date=${encodeURIComponent(date)}&host=${HOST}`;

        res.json({ url, appId: APPID });
    } catch (error) {
        console.error('[xf-ws-url] 签名生成失败:', error);
        res.status(500).json({ error: 'WebSocket URL 签名生成失败' });
    }
});

// ---------------------------------------------------------------------------
// 启动
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 666;
app.listen(PORT, () => {
    console.log(`✅ 讯飞语音听写服务已启动:  http://localhost:${PORT}`);
    console.log(`🔑 API 鉴权端点:           http://localhost:${PORT}/api/xf-ws-url`);
    if (!APPID || !API_SECRET || !API_KEY) {
        console.warn('⚠️  警告：未检测到 APPID / API_SECRET / API_KEY 环境变量，API 将返回 500。');
    }
});
