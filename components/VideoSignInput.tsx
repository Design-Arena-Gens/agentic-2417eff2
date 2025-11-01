"use client";
import { useEffect, useRef, useState } from "react";

export default function VideoSignInput({ onDetected }: { onDetected: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let hands: any;
    let camera: any;
    let raf: number | null = null;

    async function load() {
      // Dynamic import MediaPipe modules to avoid SSR issues
      const [{ Hands }, cam] = await Promise.all([
        import("@mediapipe/hands"),
        import("@mediapipe/camera_utils"),
      ]);
      const video = videoRef.current!;
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;

      hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });
      hands.setOptions({ maxNumHands: 2, modelComplexity: 1, minDetectionConfidence: 0.6, minTrackingConfidence: 0.6 });
      hands.onResults((results: any) => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
        if (results.multiHandLandmarks) {
          for (const landmarks of results.multiHandLandmarks) {
            drawHand(ctx, landmarks);
          }
          const guess = simpleHeuristic(results.multiHandLandmarks);
          if (guess) onDetected(guess);
        }
        ctx.restore();
      });

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      video.srcObject = stream;
      await video.play();

      camera = new (cam as any).Camera(video, {
        onFrame: async () => {
          await hands.send({ image: video });
        },
        width: 640,
        height: 480,
      });
      setReady(true);
    }

    load().catch((e) => console.error(e));

    return () => {
      if (raf) cancelAnimationFrame(raf);
      try { (videoRef.current?.srcObject as MediaStream | null)?.getTracks().forEach(t => t.stop()); } catch {}
    };
  }, [onDetected]);

  return (
    <div>
      <div style={{ position: "relative" }}>
        <video ref={videoRef} className="video" playsInline muted />
        <canvas ref={canvasRef} className="video" style={{ position: "absolute", left: 0, top: 0 }} />
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <span className="small">MediaPipe Hands heuristic (demo)</span>
      </div>
    </div>
  );
}

function drawHand(ctx: CanvasRenderingContext2D, landmarks: Array<{x:number;y:number}>){
  ctx.strokeStyle = "#7c9cff";
  ctx.fillStyle = "#35d49a";
  ctx.lineWidth = 2;
  for (const p of landmarks) {
    ctx.beginPath();
    ctx.arc(p.x * ctx.canvas.width, p.y * ctx.canvas.height, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Extremely simplified heuristic demo: counts finger openness by comparing tip to MCP distances
function simpleHeuristic(hands: any[]): string | null {
  if (!hands.length) return null;
  const lm = hands[0];
  // indices: thumb tip 4 vs 2, index tip 8 vs 5, middle 12 vs 9, ring 16 vs 13, pinky 20 vs 17
  const openCount = [
    [4,2],[8,5],[12,9],[16,13],[20,17]
  ].reduce((acc, [tip, base]) => acc + (distance(lm[tip], lm[base]) > 0.08 ? 1 : 0), 0);
  if (openCount >= 4) return "HELLO"; // open hand
  if (openCount <= 1) return "YES";   // fist-ish
  return null;
}

function distance(a: any, b: any){
  const dx = a.x - b.x, dy = a.y - b.y, dz = (a.z||0) - (b.z||0);
  return Math.sqrt(dx*dx + dy*dy + dz*dz);
}
