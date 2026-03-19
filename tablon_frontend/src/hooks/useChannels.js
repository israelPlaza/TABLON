import { useState, useEffect, useCallback } from "react";
import { apiGetChannels } from "../api/client";

export function useChannels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGetChannels();
      setChannels(data);
    } catch (e) {
      console.error("Error cargando canales:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  return { channels, loading, reload: load };
}
