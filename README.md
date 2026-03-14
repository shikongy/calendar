# 日历应用

一个功能完善的 Web 日历应用，支持日程管理、代办事项、记事本功能。

## 功能特性

### 日历
- 日历视图展示
- 创建、编辑、删除日程
- 自定义日程颜色
- 自动提醒通知

### 代办事项
- 创建、编辑、删除待办事项
- 支持优先级（高/中/低）
- 截止日期设置（今日/本周/本月/自定义）
- 标记完成
- 截止日期自动推送通知

### 记事本
- 创建、编辑、删除记事
- 支持分类颜色
- 支持图片上传
- 支持截图直接粘贴
- 在日历中显示记事

## 技术栈

- 前端：原生 HTML/CSS/JavaScript
- 后端：Node.js + Express
- 实时通信：WebSocket
- 文件上传：Multer

## 启动方式

```bash
# 安装依赖
npm install

# 启动服务
node calendar-server.js
```

服务启动后访问 http://localhost:3000

## API 接口

### 日程 (Events)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/events | 获取所有日程 |
| GET | /api/events/:id | 获取单个日程 |
| POST | /api/events | 创建日程 |
| PUT | /api/events/:id | 更新日程 |
| DELETE | /api/events/:id | 删除日程 |
| GET | /api/events/date/:date | 按日期查询日程 |
| POST | /api/reminder/push | 推送日程提醒 |

### 代办事项 (Todos)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/todos | 获取所有代办 |
| POST | /api/todos | 创建代办 |
| PUT | /api/todos/:id | 更新代办 |
| DELETE | /api/todos/:id | 删除代办 |
| POST | /api/todo/reminder/push | 推送代办提醒 |

### 记事本 (Notes)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/notes | 获取所有记事 |
| POST | /api/notes | 创建记事（支持图片上传） |
| PUT | /api/notes/:id | 更新记事（支持图片上传） |
| DELETE | /api/notes/:id | 删除记事 |

## 自动提醒功能

### 日程提醒
当日程设置提醒后，系统会在提醒时间通过桌面通知和页面弹窗提醒。

### 代办截止日期提醒
当代办超过截止日期时，系统会自动推送通知提醒。

## WebSocket 消息

| 类型 | 说明 |
|------|------|
| reminder | 日程提醒通知 |
| todo-updated | 代办更新通知 |
| todo-overdue | 代办逾期通知 |
| todo-reminder | 代办手动提醒 |
| note-updated | 记事更新通知 |

## 目录结构

```
.
├── calendar.html      # 前端页面
├── calendar-server.js # 后端服务
├── data.json         # 数据存储
├── uploads/          # 上传的图片
├── package.json      # 项目配置
└── README.md        # 说明文档
```
