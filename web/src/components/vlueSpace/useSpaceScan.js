import { useCallback, useEffect, useRef, useState } from "react";
import { acceptStable, directionCue, measureHotspot } from "../../lib/vlueSpace/analyzeFrame.js";
import { applyOpticalPalette } from "../../lib/vlueSpace/opticalPalette.js";
import { requestSpaceGuide } from "../../lib/vlueSpace/spaceGuide.js";
import { readSpaceAuth } from "../../lib/vlueSpace/spaceSession.js";

function stopStream(stream) {
  stream?.getTracks?.().forEach((track) => {
    try {
      track.stop();
    } catch {
      /* ignore */
    }
  });
}

function speak(text, guidance) {
  if (guidance !== "STANDARD" || !text || typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.rate = 1.05;
    window.speechSynthesis.speak(utter);
  } catch {
    /* ignore */
  }
}

function silence() {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

export function useSpaceScan(config, active) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const configRef = useRef(config);
  const loopRef = useRef(0);
  const stableRef = useRef({ streak: 0, point: null });
  const guideAbort = useRef(null);
  const runToken = useRef(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioStream = useRef(null);
  const lastGuideAt = useRef(0);
  const lastUiAt = useRef(0);
  const lockedRef = useRef(false);
  const startedRef = useRef(false);
  configRef.current = config;

  const [phase, setPhase] = useState("idle");
  const [cameraError, setCameraError] = useState("");
  const [sampleMode, setSampleMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [reading, setReading] = useState({ hotspot: null, cue: directionCue(null, 1), locked: false });
  const [guide, setGuide] = useState({ text: "스캔 시작 후 안내가 표시됩니다.", source: "local" });
  const [signals, setSignals] = useState({ radio: "", audio: "", motion: "" });
  const [logs, setLogs] = useState([]);
  const [recording, setRecording] = useState(false);
  const [recordNote, setRecordNote] = useState("");

  const pushLog = useCallback((line) => {
    setLogs((prev) => [{ id: `${Date.now()}-${prev.length}`, line, at: new Date().toLocaleTimeString("ko-KR") }, ...prev].slice(0, 12));
  }, []);

  const releaseMedia = useCallback(() => {
    runToken.current += 1;
    guideAbort.current?.abort();
    guideAbort.current = null;
    silence();
    try {
      if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    } catch {
      /* ignore */
    }
    recorderRef.current = null;
    chunksRef.current = [];
    stopStream(videoRef.current?.srcObject);
    if (videoRef.current) videoRef.current.srcObject = null;
    stopStream(audioStream.current);
    audioStream.current = null;
    setRecording(false);
  }, []);

  const askGuide = useCallback(
    async (reason, snapshot) => {
      const current = configRef.current;
      const now = Date.now();
      if (reason !== "request" && now - lastGuideAt.current < 8000) return;
      lastGuideAt.current = now;
      guideAbort.current?.abort();
      const controller = new AbortController();
      guideAbort.current = controller;
      const input = {
        palette: current.palette,
        zoom,
        stability: current.stability,
        hotspot: snapshot?.hotspot || null,
        needZoom: snapshot?.needZoom,
        radioNote: current.radio ? signals.radio : "",
        audioNote: current.audioSensor ? signals.audio : "",
        mode: current.mode
      };
      const next = await requestSpaceGuide(input, controller.signal);
      if (controller.signal.aborted) return;
      setGuide(next);
      if (current.guidance === "STANDARD") speak(next.text, current.guidance);
      else silence();
    },
    [signals.audio, signals.radio, zoom]
  );

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const current = configRef.current;
    if (!canvas || !active) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    const video = videoRef.current;
    const live = video && video.readyState >= 2 && !sampleMode;
    const vw = live ? video.videoWidth : 640;
    const vh = live ? video.videoHeight : 480;
    if (canvas.width !== 640) canvas.width = 640;
    if (canvas.height !== 480) canvas.height = 480;
    const z = Math.max(1, zoom);
    const sw = vw / z;
    const sh = vh / z;
    const maxX = Math.max(0, vw - sw);
    const maxY = Math.max(0, vh - sh);
    const sx = maxX * (0.5 + pan.x * 0.5);
    const sy = maxY * (0.5 + pan.y * 0.5);
    if (!live) {
      ctx.fillStyle = "#05080d";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      stableRef.current = { streak: 0, point: null };
      lockedRef.current = false;
      const idleNow = performance.now();
      if (idleNow - lastUiAt.current > 180) {
        lastUiAt.current = idleNow;
        setReading({ hotspot: null, cue: directionCue(null, z), locked: false, needZoom: false, rejected: "", live: false });
      }
      return;
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const measured = current.optical ? measureHotspot(frame, current.suppress) : { hotspot: null, mean: 0 };
    const stable = current.optical
      ? acceptStable(stableRef.current, measured.hotspot, current.stability, z)
      : { locked: false, streak: 0, point: null };
    stableRef.current = stable;
    applyOpticalPalette(frame, current.palette);
    ctx.putImageData(frame, 0, 0);
    const cue = directionCue(stable.point, z);
    const now = performance.now();
    if (now - lastUiAt.current > 180) {
      lastUiAt.current = now;
      setReading({
        hotspot: stable.point,
        cue,
        locked: stable.locked,
        needZoom: Boolean(stable.needZoom),
        rejected: measured.rejected || "",
        live
      });
    }
    if (stable.locked && !lockedRef.current) {
      lockedRef.current = true;
      try {
        navigator.vibrate?.(18);
      } catch {
        /* ignore */
      }
      void askGuide("lock", { hotspot: stable.point, needZoom: stable.needZoom });
    }
    if (!stable.locked) lockedRef.current = false;
  }, [active, askGuide, pan.x, pan.y, sampleMode, zoom]);

  useEffect(() => {
    if (!active) return undefined;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      drawFrame();
      loopRef.current = requestAnimationFrame(tick);
    };
    loopRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(loopRef.current);
    };
  }, [active, drawFrame]);

  useEffect(() => {
    if (!active || !config.audioSensor) {
      stopStream(audioStream.current);
      audioStream.current = null;
      setSignals((prev) => ({ ...prev, audio: "", motion: config.audioSensor ? prev.motion : "" }));
      return undefined;
    }
    let cancelled = false;
    let audioCtx;
    let meter = 0;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        if (cancelled) {
          stopStream(stream);
          return;
        }
        audioStream.current = stream;
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const bins = new Uint8Array(analyser.frequencyBinCount);
        const read = () => {
          if (cancelled) return;
          analyser.getByteTimeDomainData(bins);
          let sum = 0;
          for (let i = 0; i < bins.length; i += 1) {
            const v = (bins[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / bins.length);
          setSignals((prev) => ({ ...prev, audio: `레벨 ${rms.toFixed(3)} · 참고` }));
          meter = requestAnimationFrame(read);
        };
        meter = requestAnimationFrame(read);
      } catch {
        if (!cancelled) setSignals((prev) => ({ ...prev, audio: "마이크를 쓸 수 없습니다." }));
      }
    })();
    let motionOn = false;
    const onMotion = (event) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const mag = Math.hypot(acc.x || 0, acc.y || 0, acc.z || 0);
      setSignals((prev) => ({ ...prev, motion: `움직임 ${mag.toFixed(2)}` }));
    };
    try {
      window.addEventListener("devicemotion", onMotion);
      motionOn = true;
    } catch {
      motionOn = false;
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(meter);
      audioCtx?.close?.().catch(() => {});
      stopStream(audioStream.current);
      audioStream.current = null;
      if (motionOn) window.removeEventListener("devicemotion", onMotion);
    };
  }, [active, config.audioSensor]);

  useEffect(() => {
    if (!active || !config.radio) {
      setSignals((prev) => ({ ...prev, radio: "" }));
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const bridge = window.VlueLettering || window.Android;
      if (typeof bridge?.readSpaceSignals === "function") {
        try {
          const raw = await bridge.readSpaceSignals();
          if (!cancelled) setSignals((prev) => ({ ...prev, radio: String(raw || "주변 신호 참고 없음") }));
          return;
        } catch {
          /* fall through */
        }
      }
      let ble = "이 브라우저에서는 주변 BLE·Wi-Fi 목록을 읽지 않습니다.";
      try {
        if (navigator.bluetooth?.getAvailability) {
          const ok = await navigator.bluetooth.getAvailability();
          ble = ok ? "Bluetooth는 사용 가능합니다. 목록 스캔은 하지 않았습니다." : ble;
        }
      } catch {
        /* keep message */
      }
      if (!cancelled) setSignals((prev) => ({ ...prev, radio: ble }));
    })();
    return () => {
      cancelled = true;
    };
  }, [active, config.radio]);

  const start = useCallback(async () => {
    releaseMedia();
    const token = runToken.current;
    setCameraError("");
    setRecordNote("");
    setPhase("live");
    startedRef.current = true;
    stableRef.current = { streak: 0, point: null };
    if (config.mode === "closed" && !readSpaceAuth().closedAllowed) {
      setPhase("locked");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      if (token !== runToken.current || !videoRef.current) {
        stopStream(stream);
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
      setSampleMode(false);
      pushLog("카메라 스트림을 열었습니다.");
    } catch (err) {
      if (token !== runToken.current) return;
      setSampleMode(true);
      setCameraError(err?.name === "NotAllowedError" ? "카메라 권한이 없습니다. 측정값을 만들지 않습니다." : "카메라를 열 수 없습니다. 측정값을 만들지 않습니다.");
      pushLog("카메라 프레임 없음");
    }
  }, [config.mode, pushLog, releaseMedia]);

  const stop = useCallback(() => {
    const wasRunning = startedRef.current;
    releaseMedia();
    setPhase("idle");
    setSampleMode(false);
    startedRef.current = false;
    if (wasRunning) pushLog("스캔을 종료하고 장치를 닫았습니다.");
  }, [pushLog, releaseMedia]);

  const nudge = useCallback((axis, delta) => {
    setPan((prev) => ({ ...prev, [axis]: Math.max(-1, Math.min(1, prev[axis] + delta)) }));
  }, []);

  const changeZoom = useCallback((next) => {
    setZoom(next);
    if (next === 1) setPan({ x: 0, y: 0 });
    pushLog(`${next.toFixed(1)}x`);
  }, [pushLog]);

  const capture = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    pushLog("스냅샷 · 초상권 주의 · OS가 소리를 낼 수 있습니다.");
    await askGuide("request", { hotspot: reading.hotspot, needZoom: reading.needZoom });
    await new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve();
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `vlue-space-${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);
        resolve();
      }, "image/png");
    });
  }, [askGuide, pushLog, reading.hotspot, reading.needZoom]);

  const toggleRecord = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (recording) {
      try {
        recorderRef.current?.stop();
      } catch {
        setRecordNote("녹화를 마치지 못했습니다. 스냅샷으로 남기세요.");
      }
      return;
    }
    const stream = canvas.captureStream?.(12);
    const Ctor = window.MediaRecorder;
    if (!stream || !Ctor) {
      setRecordNote("이 환경은 녹화를 지원하지 않습니다. 스냅샷으로 남기세요.");
      pushLog("녹화 미지원 · 스냅샷 폴백");
      return;
    }
    try {
      const recorder = new Ctor(stream, { mimeType: Ctor.isTypeSupported("video/webm") ? "video/webm" : undefined });
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `vlue-space-${Date.now()}.webm`;
        link.click();
        URL.revokeObjectURL(url);
        setRecording(false);
        pushLog("녹화 저장 · 외부 공유 전 초상권을 확인하세요.");
      };
      recorder.start(400);
      recorderRef.current = recorder;
      setRecording(true);
      setRecordNote("녹화 중에도 OS 알림음이 날 수 있습니다.");
    } catch {
      setRecordNote("녹화를 시작하지 못했습니다. 스냅샷으로 남기세요.");
      setRecording(false);
    }
  }, [pushLog, recording]);

  useEffect(() => {
    if (!active || config.mode !== "closed") return undefined;
    const watch = () => {
      if (!readSpaceAuth().closedAllowed) {
        releaseMedia();
        setPhase("locked");
      }
    };
    document.addEventListener("visibilitychange", watch);
    window.addEventListener("storage", watch);
    const timer = window.setInterval(watch, 1000);
    return () => {
      document.removeEventListener("visibilitychange", watch);
      window.removeEventListener("storage", watch);
      window.clearInterval(timer);
    };
  }, [active, config.mode, releaseMedia]);

  useEffect(() => {
    if (!active) releaseMedia();
  }, [active, releaseMedia]);

  useEffect(() => () => releaseMedia(), [releaseMedia]);

  return {
    videoRef,
    canvasRef,
    phase,
    cameraError,
    sampleMode,
    zoom,
    reading,
    guide,
    signals,
    logs,
    recording,
    recordNote,
    start,
    stop,
    nudge,
    changeZoom,
    capture,
    toggleRecord,
    askGuide
  };
}
