"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export default function SpeechInput({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any | null>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const SpeechRecognition: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: any) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          finalText += res[0].transcript;
        }
      }
      if (finalText.trim()) onTranscript(finalText.trim());
    };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, [onTranscript]);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (!listening) {
      recognitionRef.current.start();
      setListening(true);
    } else {
      recognitionRef.current.stop();
    }
  };

  return (
    <div>
      {!supported && <div className="small">Speech recognition not supported in this browser.</div>}
      <div className="row">
        <button className="button primary" onClick={toggle} disabled={!supported}>
          {listening ? "Stop" : "Start"} Listening
        </button>
        <span className="small">Language: en-US</span>
      </div>
    </div>
  );
}
