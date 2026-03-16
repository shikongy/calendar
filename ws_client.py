#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import websocket
import sys
import os
import datetime
import threading

# 设置stdout编码为utf-8
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')

# 尝试导入 Windows 桌面通知
try:
    import win10toast
    HAS_WIN10TOAST = True
except ImportError:
    HAS_WIN10TOAST = False

# 消息队列文件
QUEUE_FILE = os.path.join(os.path.dirname(__file__), 'msg_queue.json')

def get_queue():
    if os.path.exists(QUEUE_FILE):
        try:
            with open(QUEUE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return []
    return []

def save_queue(msgs):
    with open(QUEUE_FILE, 'w', encoding='utf-8') as f:
        json.dump(msgs, f, ensure_ascii=False, indent=2)

def add_message(msg):
    """添加消息到队列"""
    msgs = get_queue()
    msgs.append({
        'time': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'msg': msg
    })
    # 只保留最近100条消息
    if len(msgs) > 100:
        msgs = msgs[-100:]
    save_queue(msgs)

def show_notification(title, message):
    """显示桌面通知"""
    print(f"[通知] {title}: {message}")

    if HAS_WIN10TOAST:
        try:
            toast = win10toast.ToastNotifier()
            toast.show_toast(title, message, duration=5, threaded=False)
        except Exception as e:
            print(f"[通知失败] {e}")
    else:
        # 如果没有 win10toast，使用 Windows 命令行通知
        if sys.platform == 'win32':
            os.system(f'echo {message} | msg * /TIME:5')

def on_message(ws, message):
    try:
        data = json.loads(message)
        msg_type = data.get('type')

        # 日程提醒
        if msg_type == 'reminder':
            event = data.get('event', {})
            title = event.get('title', '')
            start = event.get('start', '')
            msg = f"[提醒] {title} - 时间: {start}"
            add_message(msg)
            show_notification("日程提醒", f"{title} - 时间: {start}")

        # 待办手动提醒
        elif msg_type == 'todo-reminder':
            todo = data.get('todo', {})
            title = todo.get('title', '')
            due = todo.get('dueDate', '')
            msg = f"[待办提醒] {title} - 截止: {due}"
            add_message(msg)
            show_notification("待办提醒", f"{title} 截止时间快到了!")

        # 待办更新
        elif msg_type == 'todo-updated':
            action = data.get('action')
            todo = data.get('todo', {})
            title = todo.get('title', '')
            due = todo.get('dueDate', '')
            priority = todo.get('priority', '')

            action_map = {'create': '新增待办', 'update': '更新待办', 'delete': '删除待办'}
            action_text = action_map.get(action, action)

            due_str = f" - 截止: {due}" if due else ""
            priority_str = f" - 优先级: {priority}" if priority else ""

            msg = f"[待办] {action_text}: {title}{due_str}{priority_str}"
            add_message(msg)

            # 创建/更新时显示通知
            if action in ['create', 'update']:
                show_notification("待办更新", f"{action_text}: {title}")

        # 日程更新
        elif msg_type == 'event-updated':
            action = data.get('action')
            event = data.get('event', {})
            title = event.get('title', '')
            start = event.get('start', '')

            action_map = {'create': '新增日程', 'update': '更新日程', 'delete': '删除日程'}
            action_text = action_map.get(action, action)

            start_str = f" - 时间: {start}" if start else ""

            msg = f"[日程] {action_text}: {title}{start_str}"
            add_message(msg)

            # 创建/更新时显示通知
            if action in ['create', 'update']:
                show_notification("日程更新", f"{action_text}: {title}")

        # 记事更新
        elif msg_type == 'note-updated':
            action = data.get('action')
            note = data.get('note', {})
            title = note.get('title', '')

            action_map = {'create': '新增记事', 'update': '更新记事', 'delete': '删除记事'}
            action_text = action_map.get(action, action)

            msg = f"[记事] {action_text}: {title}"
            add_message(msg)

            # 创建/更新时显示通知
            if action in ['create', 'update']:
                show_notification("记事更新", f"{action_text}: {title}")

        # 待办逾期
        elif msg_type == 'todo-overdue':
            todo = data.get('todo', {})
            title = todo.get('title', '')
            due = todo.get('dueDate', '')
            msg = f"[逾期] {title} - 已过期! 截止时间: {due}"
            add_message(msg)
            show_notification("待办逾期!", f"{title} 已超过截止日期!")

    except Exception as e:
        print(f"[错误] 解析失败: {e}")

def on_error(ws, error):
    print(f"[错误] {error}")

def on_close(ws, close_status_code, close_msg):
    print(f"[断开] 连接关闭，5秒后重连...")
    # 5秒后自动重连
    threading.Timer(5, reconnect, [ws]).start()

def reconnect(ws):
    """重连"""
    try:
        ws.run_forever()
    except:
        print("[重连失败]")

def on_open(ws):
    print("[连接] 已连接到日历服务器")
    print("=" * 50)
    print("等待接收通知...")
    print("  - 日程创建/修改/删除")
    print("  - 待办创建/修改/删除")
    print("  - 记事创建/修改/删除")
    print("  - 日程提醒")
    print("  - 待办提醒")
    print("  - 待办逾期通知")
    print("=" * 50)

if __name__ == "__main__":
    print("[启动] 日历 WebSocket 客户端...")
    print(f"[通知功能] {'已启用' if HAS_WIN10TOAST else '未启用(安装: pip install win10toast)'}")

    # 如果没有 win10toast，提示安装
    if not HAS_WIN10TOAST:
        print("[提示] 安装 win10toast 可以显示桌面通知:")
        print("       pip install win10toast")

    ws_url = "ws://localhost:3000"

    while True:
        try:
            ws = websocket.WebSocketApp(
                ws_url,
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close
            )
            ws.run_forever()
        except Exception as e:
            print(f"[错误] {e}")
            print("[重试] 5秒后重新连接...")
            import time
            time.sleep(5)
