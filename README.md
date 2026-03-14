# 日历应用

一个简单的 Web 日历应用，支持日程管理和自动提醒功能。

## 功能特性

- 日历视图展示
- 创建、编辑、删除日程
- 自定义日程颜色
- **自动提醒通知**（新增）

## 技术栈

- 前端：原生 HTML/CSS/JavaScript
- 后端：Node.js + Express
- 实时通信：WebSocket

## 启动方式

```bash
# 安装依赖
npm install

# 启动服务
node calendar-server.js
```

服务启动后访问 http://localhost:3000

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/events | 获取所有日程 |
| GET | /api/events/:id | 获取单个日程 |
| POST | /api/events | 创建日程 |
| PUT | /api/events/:id | 更新日程 |
| DELETE | /api/events/:id | 删除日程 |
| GET | /api/events/date/:date | 按日期查询日程 |
| POST | /api/reminder/push | 推送提醒 |

## 自动提醒功能

当日程设置提醒后，系统会在提醒时间通过以下方式通知：

1. **桌面通知**：使用浏览器 Notification API
2. **页面弹窗**：显示提醒消息

### 工作原理

1. 后端每 30 秒检查所有日程
2. 当到达提醒时间（事件开始时间 - 提醒分钟数）时
3. 通过 WebSocket 向所有连接的客户端推送提醒
4. 客户端收到提醒后显示桌面通知和弹窗

### 提醒选项

- 不提醒
- 5 分钟前
- 15 分钟前
- 30 分钟前
- 1 小时前
- 1 天前
