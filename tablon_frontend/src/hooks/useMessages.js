import { useState, useEffect, useRef, useCallback } from "react";
import {
  apiGetMessages, apiSendMessage, apiDeleteMessage,
  apiToggleReaction, openWebSocket,
} from "../api/client";

export function useMessages(subchannelId, subchannelName, currentUser, onNewMessage) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const subchannelIdRef = useRef(subchannelId);

  useEffect(() => { subchannelIdRef.current = subchannelId; }, [subchannelId]);

  const applyEvent = useCallback((event) => {
    if (event.subchannel_id !== subchannelIdRef.current) return;

    if (event.type === "new_message") {
      setMessages((prev) =>
        prev.find((m) => m.id === event.payload.id) ? prev : [...prev, event.payload]
      );

      // Notificar al padre para el contador y menciones
      if (event.payload?.author?.id !== currentUser?.id) {
        onNewMessage?.(event.payload, subchannelName);
      }
    } else if (event.type === "reaction") {
      setMessages((prev) =>
        prev.map((m) => (m.id === event.payload.id ? event.payload : m))
      );
    } else if (event.type === "delete") {
      setMessages((prev) => prev.filter((m) => m.id !== event.payload.id));
    }
  }, [currentUser, onNewMessage, subchannelName]);

  useEffect(() => {
    if (!subchannelId) { setMessages([]); return; }
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    setMessages([]);
    setLoading(true);
    setError(null);

    apiGetMessages(subchannelId)
      .then((data) => setMessages(data.messages))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    const ws = openWebSocket(subchannelId, applyEvent);
    wsRef.current = ws;
    return () => { ws.close(); wsRef.current = null; };
  }, [subchannelId]);

  const sendMessage = useCallback(async (text, file) => {
    await apiSendMessage(subchannelId, text, file);
  }, [subchannelId]);

  const deleteMessage = useCallback(async (id) => { await apiDeleteMessage(id); }, []);
  const toggleReaction = useCallback(async (id, emoji) => { await apiToggleReaction(id, emoji); }, []);

  return { messages, loading, error, sendMessage, deleteMessage, toggleReaction };
}
