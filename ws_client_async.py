#!/usr/bin/env python3
"""
日历 WebSocket 客户端示例 (使用 websockets 库)
用于接收自动提醒通知

安装依赖:
    pip install websockets

运行:
    python ws_client_async.py
"""

import asyncio
import json
import websockets

async def client():
    uri = "ws://localhost:3000"

    print("启动日历 WebSocket 客户端...")
    print(f"连接地址: {uri}\n")

    try:
        async with websockets.connect(uri) as ws:
            print("✓ 已连接到日历服务器")
            print("等待接收提醒通知...\n")

            async for message in ws:
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

    except websockets.exceptions.ConnectionClosed:
        print("连接已关闭，正在重连...")
        await asyncio.sleep(3)
        await client()

if __name__ == "__main__":
    asyncio.run(client())
