#!/usr/bin/env python3
"""
日历 WebSocket 客户端示例
用于接收自动提醒通知

安装依赖:
    pip install websocket-client
或
    pip install websockets
"""

import json
import websocket

def on_message(ws, message):
    """收到消息时的处理"""
    try:
        data = json.loads(message)
        if data.get('type') == 'reminder':
            event = data.get('event', {})
            print(f"\n{'='*50}")
            print(f"🔔 收到日程提醒!")
            print(f"   标题: {event.get('title')}")
            print(f"   时间: {event.get('start')}")
            print(f"   提醒: {data.get('message')}")
            print(f"{'='*50}\n")
    except Exception as e:
        print(f"解析消息失败: {e}")

def on_error(ws, error):
    """错误处理"""
    print(f"错误: {error}")

def on_close(ws, close_status_code, close_msg):
    """连接关闭时的处理"""
    print("连接已关闭")

def on_open(ws):
    """连接成功时的处理"""
    print("✓ 已连接到日历服务器")
    print("等待接收提醒通知...\n")

if __name__ == "__main__":
    # WebSocket 服务器地址
    ws_url = "ws://localhost:3000"

    # 创建 WebSocket 连接
    ws = websocket.WebSocketApp(
        ws_url,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )

    # 运行客户端 (自动重连)
    print("启动日历 WebSocket 客户端...")
    print(f"连接地址: {ws_url}\n")

    ws.run_forever()
