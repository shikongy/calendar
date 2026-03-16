# 日历 WebSocket 客户端

实时接收日历应用的通知。

## 功能

- 接收日程创建/修改/删除通知
- 接收待办创建/修改/删除通知
- 接收记事创建/修改/删除通知
- 接收日程提醒通知
- 接收待办提醒通知
- 接收待办逾期通知
- 自动重连

## 安装依赖

```bash
pip install websocket-client
```

可选 - 桌面通知功能：

```bash
pip install win10toast
```

## 运行

```bash
python ws_client.py
```

## 消息记录

消息会保存到 `msg_queue.json` 文件中。
