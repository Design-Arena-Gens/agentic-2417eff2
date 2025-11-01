"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { create } from "zustand";
import clsx from "clsx";
import VideoSignInput from "@/components/VideoSignInput";
import SpeechInput from "@/components/SpeechInput";
import TextInput from "@/components/TextInput";

type ChatMessage = {
  id: string;
  user: string;
  text: string;
  modality: "text" | "speech" | "sign";
  timestamp: number;
};

type StoreState = {
  userName: string;
  setUserName: (n: string) => void;
  roomId: string | null;
  setRoomId: (id: string | null) => void;
  connected: boolean;
  ws: WebSocket | null;
  connect: (roomId: string) => void;
  disconnect: () => void;
  sendMessage: (m: Omit<ChatMessage, "id" | "timestamp">) => void;
  messages: ChatMessage[];
  addLocalMessage: (m: ChatMessage) => void;
};

const useStore = create<StoreState>((set, get) => ({
  userName: "Guest",
  setUserName: (n) => set({ userName: n }),
  roomId: null,
  setRoomId: (id) => set({ roomId: id }),
  connected: false,
  ws: null,
  connect: (roomId: string) => {
    try {
      const url = new URL("/api/ws", window.location.origin);
      url.searchParams.set("room", roomId);
      url.searchParams.set("user", get().userName || "Guest");
      const ws = new WebSocket(url);
      ws.onopen = () => set({ connected: true });
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "chat") {
            set((s) => ({ messages: [...s.messages, data.payload] }));
          } else if (data.type === "system" && data.payload?.hello) {
            // no-op
          }
        } catch {}
      };
      ws.onclose = () => set({ connected: false, ws: null });
      set({ ws, roomId });
    } catch (e) {
      console.error(e);
    }
  },
  disconnect: () => {
    const ws = get().ws;
    ws?.close();
    set({ connected: false, ws: null, roomId: null });
  },
  sendMessage: (m) => {
    const payload: ChatMessage = {
      id: crypto.randomUUID(),
      user: get().userName || "Guest",
      text: m.text,
      modality: m.modality,
      timestamp: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, { ...payload }] }));
    get().ws?.send(JSON.stringify({ type: "chat", payload }));
  },
  messages: [],
  addLocalMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
}));

function useTranslator(targetLang: string) {
  const [loading, setLoading] = useState(false);
  const translate = async (text: string) => {
    if (!text.trim()) return text;
    setLoading(true);
    try {
      const res = await fetch(`/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, target: targetLang }),
      });
      const data = await res.json();
      return data.translated ?? text;
    } catch {
      return text;
    } finally {
      setLoading(false);
    }
  };
  return { translate, loading };
}

export default function Home() {
  const { userName, setUserName, roomId, setRoomId, connect, disconnect, connected, sendMessage, messages } = useStore();
  const [targetLang, setTargetLang] = useState("en");
  const { translate } = useTranslator(targetLang);

  const onAnyText = async (text: string, modality: "text" | "speech" | "sign") => {
    const translated = await translate(text);
    sendMessage({ user: userName, text: translated, modality });
  };

  const createRoom = () => {
    const id = Math.random().toString(36).slice(2, 8).toUpperCase();
    setRoomId(id);
    connect(id);
  };

  const joinRoom = () => {
    if (roomId) connect(roomId);
  };

  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <div className="brand-badge" />
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>TriConnectAI</div>
            <div className="small">Real-Time Multi-Modal Translation</div>
          </div>
        </div>
        <div className="row">
          <span className="badge"><span className={clsx("status-dot", connected ? "status-on" : "status-off")} /> {connected ? "Connected" : "Disconnected"}</span>
          <span className="badge">Lang: {targetLang.toUpperCase()}</span>
        </div>
      </header>

      <div className="grid">
        <div className="card">
          <div className="section-title">Session</div>
          <div className="row" style={{ marginBottom: 12 }}>
            <input className="input" placeholder="Display name" value={userName} onChange={(e) => setUserName(e.target.value)} style={{ maxWidth: 240 }} />
            <input className="input" placeholder="Room code" value={roomId ?? ""} onChange={(e) => setRoomId(e.target.value.toUpperCase())} style={{ maxWidth: 200 }} />
            <button className="button primary" onClick={createRoom}>Create</button>
            <button className="button" onClick={joinRoom} disabled={!roomId}>Join</button>
            <button className="button" onClick={disconnect} disabled={!connected}>Leave</button>
          </div>
          <div className="row">
            <select className="input" style={{ maxWidth: 200 }} value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="pt">Portuguese</option>
            </select>
            <span className="tag">Share code: {roomId || "(none)"}</span>
          </div>
        </div>

        <div className="card">
          <div className="section-title">Text</div>
          <TextInput onSubmit={(t) => onAnyText(t, "text")} />
        </div>

        <div className="card">
          <div className="section-title">Speech</div>
          <SpeechInput onTranscript={(t) => onAnyText(t, "speech")} />
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="section-title">Sign (MediaPipe)</div>
          <VideoSignInput onDetected={(t) => onAnyText(t, "sign")} />
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div className="section-title">Messages</div>
          <div className="messages">
            {messages.map((m) => (
              <div key={m.id} className={clsx("msg", m.user === userName && "me")}> 
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{m.user}</strong>
                  <span className="small">{new Date(m.timestamp).toLocaleTimeString()} ? {m.modality}</span>
                </div>
                <div>{m.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
