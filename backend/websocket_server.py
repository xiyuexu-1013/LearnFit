import asyncio
import websockets
import json

class WSServer:
    def __init__(self, host='localhost', port=8765):
        self.host = host
        self.port = port
        self.clients = set()
        self.current_data = {}
        # 核心修复：新增指令队列，防止 main.py 报错
        self.command_queue = [] 

    def update_data(self, data):
        self.current_data = data

    async def handler(self, websocket, path):
        self.clients.add(websocket)
        try:
            while True:
                # 1. 尝试接收前端发来的指令 (带超时，不阻塞发送)
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=0.01)
                    data = json.loads(message)
                    if "action" in data:
                        self.command_queue.append(data)
                except asyncio.TimeoutError:
                    pass
                
                # 2. 将后端的画面和分数推流给前端
                if self.current_data:
                    await websocket.send(json.dumps(self.current_data))
                
                await asyncio.sleep(0.03) # 控制网络发送频率
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.remove(websocket)

    async def start(self):
        print(f"🚀 WebSocket server started on ws://{self.host}:{self.port}")
        async with websockets.serve(self.handler, self.host, self.port):
            await asyncio.Future()  # 持续运行
