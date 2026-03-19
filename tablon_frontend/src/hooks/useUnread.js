import { useState, useEffect, useRef, useCallback } from "react";
import { getToken } from "../api/client";

export function useUnread(currentUser, activeSubchannelId) {
  const [unread, setUnread] = useState({});
  const wsRef = useRef(null);
  const activeSubchannelIdRef = useRef(activeSubchannelId);

  useEffect(() => {
    activeSubchannelIdRef.current = activeSubchannelId;
  }, [activeSubchannelId]);

  useEffect(() => {
    if (!currentUser) return;

    const token = getToken();
    const wsBase = `ws://${window.location.host}`;
    const ws = new WebSocket(`${wsBase}/api/ws/global?token=${token}`);

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (
          event.type === "new_message" &&
          event.payload?.author?.id !== currentUser.id &&
          event.subchannel_id !== activeSubchannelIdRef.current
        ) {
          setUnread((prev) => ({
            ...prev,
            [event.subchannel_id]: (prev[event.subchannel_id] || 0) + 1,
          }));

          // Notificación si me mencionan
          const text = event.payload?.text || "";
          const firstName = currentUser.name?.split(" ")[0]?.toLowerCase() || "";
          if (text.toLowerCase().includes(`@${firstName}`)) {
            sendBrowserNotification(
              `📢 Te han mencionado`,
              event.payload?.author?.name,
              text
            );
          }
        }
      } catch (_) {}
    };

    ws.onerror = () => {};
    wsRef.current = ws;

    return () => { ws.close(); wsRef.current = null; };
  }, [currentUser]);

  const markRead = useCallback((subchannelId) => {
    setUnread((prev) => ({ ...prev, [subchannelId]: 0 }));
  }, []);

  return { unread, markRead };
}

function sendBrowserNotification(title, author, text) {
  if (!("Notification" in window)) return;
  const send = () => new Notification(title, {
    body: `${author}: ${text.slice(0, 100)}`,
    icon: "/logo-hartford.png",
  });
  if (Notification.permission === "granted") send();
  else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((p) => { if (p === "granted") send(); });
  }
}
