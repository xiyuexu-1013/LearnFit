import asyncio
import websockets
import json

class WSServer:
    def __init__(self, host="localhost", port=8765):
        self.host = host
        self.port = port
        self.current_data = {}

    def update_data(self, data):
        self.current_data = data

    async def _handler(self, websocket):
        print("🟢 Web Dashboard Connected!")
        try:
            while True:
                if self.current_data:
                    await websocket.send(json.dumps(self.current_data))
                await asyncio.sleep(0.5)
        except websockets.exceptions.ConnectionClosed:
            print("🔴 Web Dashboard Disconnected.")

    async def start(self):
        print(f"Starting WebSocket server on ws://{self.host}:{self.port} ...")
        async with websockets.serve(self._handler, self.host, self.port):
            await asyncio.Future()
