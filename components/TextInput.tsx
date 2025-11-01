"use client";
import { useState } from "react";

export default function TextInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div>
      <textarea className="input" rows={4} placeholder="Type your message..." value={text} onChange={(e) => setText(e.target.value)} />
      <div className="input-row" style={{ justifyContent: "space-between" }}>
        <span className="small">Enter to send</span>
        <button className="button primary" onClick={() => { if (text.trim()) { onSubmit(text.trim()); setText(""); } }}>Send</button>
      </div>
    </div>
  );
}
