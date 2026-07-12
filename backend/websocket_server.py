import asyncio
import websockets
import json
import queue
import logging

# 配置日志记录，替代 print
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class WSServer:
    def __init__(self, host='localhost', port=8765):
        self.host = host
        self.port = port
        self.clients = set()
        self.current_data = {}
        # 核心修复 1 (Bug 5)：使用线程安全的 Queue 替代 []，防止多线程数据错乱
        self.command_queue = queue.Queue() 

    def update_data(self, data):
        self.current_data = data

    # 核心修复：去掉了 'path' 参数，完美适配最新版 websockets 库
    async def handler(self, websocket):
        self.clients.add(websocket)
        logging.info("前端控制面板已连接。")
        try:
            while True:
                # 1. 尝试接收前端发来的指令 (带超时，不阻塞发送)
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=0.01)
                    data = json.loads(message)
                    if "action" in data:
                        # 使用 put 放入线程安全队列
                        self.command_queue.put(data)
                except asyncio.TimeoutError:
                    pass
                
                # 2. 将后端的画面和分数推流给前端
                if self.current_data:
                    await websocket.send(json.dumps(self.current_data))
                
                await asyncio.sleep(0.03) # 控制网络发送频率
                
        # 核心修复 2 (Bug 6)：完善异常捕获，记录断开原因，不再静默 pass
        except websockets.exceptions.ConnectionClosed as e:
            logging.warning(f"客户端连接已断开 (代码: {e.code})。")
        except Exception as e:
            logging.error(f"WebSocket 发生未知错误: {e}")
        finally:
            self.clients.remove(websocket)
            logging.info(f"客户端已清理，当前连接数: {len(self.clients)}")

    async def start(self):
        logging.info(f"🚀 WebSocket server started on ws://{self.host}:{self.port}")
        async with websockets.serve(self.handler, self.host, self.port):
            await asyncio.Future()  # 持续运行
