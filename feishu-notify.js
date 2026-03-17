const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Get config path
const configPath = path.join(__dirname, 'config.json');

// Load config from file
function loadConfig() {
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) {
        console.error('[Feishu] Failed to load config:', e.message);
    }
    return { feishu: { webhookUrl: '', enabled: false } };
}

/**
 * Send message to Feishu webhook
 * @param {string} message - Message text to send
 * @returns {Promise<boolean>} - Success status
 */
function sendFeishuMessage(message) {
    return new Promise((resolve) => {
        // Load config dynamically each time
        const config = loadConfig();
        const { webhookUrl, enabled } = config.feishu;

        console.log('[Feishu] Config loaded:', { enabled, hasWebhook: !!webhookUrl });

        if (!enabled || !webhookUrl) {
            console.log('[Feishu] Notification skipped (disabled or no webhook URL)');
            resolve(false);
            return;
        }

        // Prepare payload for Feishu custom robot
        const payload = JSON.stringify({
            msg_type: 'text',
            content: {
                text: message
            }
        });

        const url = new URL(webhookUrl);
        const isHttps = url.protocol === 'https:';
        const lib = isHttps ? https : http;

        const options = {
            hostname: url.hostname,
            port: isHttps ? 443 : 80,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('[Feishu] Message sent successfully');
                    resolve(true);
                } else {
                    console.error('[Feishu] Failed to send:', res.statusCode, data);
                    resolve(false);
                }
            });
        });

        req.on('error', (e) => {
            console.error('[Feishu] Request error:', e.message);
            resolve(false);
        });

        req.write(payload);
        req.end();
    });
}

/**
 * Send formatted reminder message
 * @param {Object} data - Reminder data with type and message
 */
async function sendReminderNotification(data) {
    const { type, message } = data;

    if (!message) return;

    let feishuMessage = '';

    switch (type) {
        case 'reminder':
            feishuMessage = `📅 日程提醒: ${message}`;
            break;
        case 'todo-overdue':
            feishuMessage = `⚠️ 待办逾期: ${message}`;
            break;
        case 'todo-reminder':
            feishuMessage = `📝 待办提醒: ${message}`;
            break;
        default:
            feishuMessage = message;
    }

    await sendFeishuMessage(feishuMessage);
}

// Reload config from file
function reloadConfig() {
    console.log('[Feishu] Config reloaded');
}

module.exports = {
    sendFeishuMessage,
    sendReminderNotification,
    reloadConfig
};
