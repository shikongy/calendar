# 日历 API 文档

## 服务地址
```
http://localhost:3000
```

## 接口列表

### 1. 获取所有事件
```
GET /api/events
```
响应示例：
```json
[
  {
    "id": "1773412638846",
    "title": "测试",
    "description": "",
    "color": "#1890ff",
    "start": "2026-03-23T09:00",
    "end": "2026-03-23T10:00",
    "reminder": 15,
    "createdAt": "2026-03-13T14:37:18.846Z",
    "updatedAt": "2026-03-13T14:37:18.846Z"
  }
]
```

### 2. 获取单个事件
```
GET /api/events/:id
```
参数：`:id` - 事件ID

### 3. 创建事件
```
POST /api/events
```
请求体：
```json
{
  "title": "会议",
  "description": "会议描述",
  "color": "#1890ff",
  "start": "2026-03-15T10:00",
  "end": "2026-03-15T11:00",
  "reminder": 15
}
```
参数说明：
- `title` (string, 必填) - 事件标题
- `description` (string) - 事件描述
- `color` (string) - 颜色代码，如 #1890ff
- `start` (string, 必填) - 开始时间，ISO 格式
- `end` (string, 必填) - 结束时间，ISO 格式
- `reminder` (number) - 提前提醒分钟数，0 不提醒

### 4. 更新事件
```
PUT /api/events/:id
```
参数：`:id` - 事件ID
请求体：同创建事件

### 5. 删除事件
```
DELETE /api/events/:id
```
参数：`:id` - 事件ID

### 6. 按日期查询事件
```
GET /api/events/date/:date
```
参数：`:date` - 日期，格式 YYYY-MM-DD
示例：`GET /api/events/date/2026-03-15`

### 7. 推送提醒
```
POST /api/reminder/push
```
请求体：
```json
{
  "eventId": "事件ID",
  "message": "自定义提醒消息"
}
```

## 启动服务

```bash
cd D:\project
node calendar-server.js
```

服务启动后会显示：
```
Calendar API running at http://localhost:3000
```

然后在浏览器打开 http://localhost:3000 访问日历界面。

## 数据存储
- 数据保存在 `D:\project\data.json`
