import asyncio
import websockets
import json

class WSServer:
    def __init__(self, host="localhost", port=8765):
        self.host = host
        self.port = port
        self.current_data = {}
        self.command_queue = [] # 指令队列，接收前端的控制命令

    def update_data(self, data):
        self.current_data = data

    async def _handler(self, websocket):
        print("🟢 Web Dashboard Connected!")
        
        # 异步任务 1：发送数据给前端（带防崩保护）
        async def send_data():
            try:
                while True:
                    if self.current_data:
                        await websocket.send(json.dumps(self.current_data))
                    await asyncio.sleep(0.05) # 锁定最高 20 FPS 下发，防止网络阻塞
            except websockets.exceptions.ConnectionClosed:
                print("🔴 Dashboard Disconnected (Send Tunnel).")
            except Exception as e:
                print(f"⚠️ WS Send Error: {e}")

        # 异步任务 2：接收前端指令（如：开始记录 CSV）
        async def receive_data():
            try:
                async for message in websocket:
                    data = json.loads(message)
                    self.command_queue.append(data)
            except websockets.exceptions.ConnectionClosed:
                print("🔴 Dashboard Disconnected (Receive Tunnel).")
            except Exception as e:
                print(f"⚠️ WS Receive Error: {e}")

        # 并发执行收发任务
        await asyncio.gather(send_data(), receive_data())

    async def start(self):
        print(f"🚀 Starting WebSocket server on ws://{self.host}:{self.port} ...")
        async with websockets.serve(self._handler, self.host, self.port):
            await asyncio.Future()
