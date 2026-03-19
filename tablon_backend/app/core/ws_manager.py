import json
from collections import defaultdict
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        # subchannel_id -> set of WebSocket
        self.active: dict[int, set[WebSocket]] = defaultdict(set)
        # WebSockets globales (escuchan todos los subcanales)
        self.global_listeners: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket, subchannel_id: int):
        await websocket.accept()
        self.active[subchannel_id].add(websocket)

    def disconnect(self, websocket: WebSocket, subchannel_id: int):
        self.active[subchannel_id].discard(websocket)

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_listeners.add(websocket)

    def disconnect_global(self, websocket: WebSocket):
        self.global_listeners.discard(websocket)

    async def broadcast(self, subchannel_id: int, event: dict):
        """Envía el evento a los conectados en ese subcanal Y a los listeners globales."""
        payload = json.dumps(event, default=str)

        # Subcanal específico
        dead = set()
        for ws in self.active[subchannel_id]:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.active[subchannel_id].discard(ws)

        # Listeners globales
        dead_global = set()
        for ws in self.global_listeners:
            try:
                await ws.send_text(payload)
            except Exception:
                dead_global.add(ws)
        for ws in dead_global:
            self.global_listeners.discard(ws)


manager = ConnectionManager()
