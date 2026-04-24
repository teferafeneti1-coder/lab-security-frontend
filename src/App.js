import React, { useRef, useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
function App() {
  const webcamRef = useRef(null);
  const ws = useRef(null);
  const [result, setResult] = useState({ boxes: [], detections: [] });

  

  const lastAlarmTime = useRef(0);

const playAlarm = useCallback(() => {
  const now = Date.now();
  if (now - lastAlarmTime.current < 3000) return;

  lastAlarmTime.current = now;

  const audio = new Audio("/alarm.mp3");
  audio.play().catch(() => {});
}, [playAlarm]);
  // 🔌 WebSocket connection
  useEffect(() => {
  ws.current = new WebSocket("wss://powdery-tarantula-ooze.ngrok-free.dev/ws");

    ws.current.onopen = () => {
      console.log("✅ WebSocket connected");
    };

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (!data || !Array.isArray(data.boxes)) return;

        setResult(data);

        if (data.theft_alert || data.abandoned_alert) {
          playAlarm();
        }

      } catch (e) {
        console.error("Bad data:", e);
      }
    };

    ws.current.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.current.onclose = () => {
      console.log("❌ WebSocket closed");
    };

    return () => ws.current.close();
  }, []);

  // 📷 Send frames safely
  useEffect(() => {
    const interval = setInterval(() => {
      if (!ws.current || ws.current.readyState !== 1) return;

      const imageSrc = webcamRef.current?.getScreenshot();

      if (!imageSrc) return;

      try {
        ws.current.send(imageSrc);
      } catch (e) {
        console.error("Send error:", e);
      }

    }, 1000); // ⚡ safer rate

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <h1>⚡ Real-Time Lab Security System</h1>

      <div style={{ position: "relative", width: 640, margin: "auto" }}>
        <Webcam
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={640}
          videoConstraints={{ width: 640, height: 480 }}
        />

        {/* 🟥 Bounding boxes */}
        {Array.isArray(result.boxes) &&
          result.boxes.map((det, index) => {
            if (!det.box) return null;

            const [x1, y1, x2, y2] = det.box;

            return (
              <div
                key={index}
                style={{
                  position: "absolute",
                  border: "3px solid red",
                  left: x1,
                  top: y1,
                  width: x2 - x1,
                  height: y2 - y1,
                  color: "red",
                  fontWeight: "bold",
                  pointerEvents: "none"
                }}
              >
                {det.label}
              </div>
            );
          })}
      </div>

      {/* 🚨 Alerts */}
      {result?.theft_alert && (
        <h2 style={{ color: "red" }}>🚨 EQUIPMENT REMOVED!</h2>
      )}

      {result?.abandoned_alert && (
        <h2 style={{ color: "orange" }}>🚨 ABANDONED ITEM!</h2>
      )}
    </div>
  );
}

export default App;