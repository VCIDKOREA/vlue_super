import { useCallback, useEffect, useRef, useState } from "react";
import { directionCue, measureCandidates, TRACK_SUSTAIN_MS, updateCandidateTracks } from "../../lib/vlueSpace/analyzeFrame.js";
import {
  applyTorch,
  buildFlashReport,
  createFlashGate,
  finishFlashSample,
  FLASH_SAMPLE_MS,
  FLASH_SETTLE_MS,
  readTorchSupport,
  shutdownVideo,
  summarizeFlashSamples,
  tryBeginFlashSample
} from "../../lib/vlueSpace/flashResponse.js";
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

const MEASURE_INTERVAL_MS = 100;
const MARK_LABEL = { candidate: "반사 후보", sustained: "지속 관찰", review: "추가 확인" };

function markerKind(track, stability, zoom) {
  const sustained = track.status === "sustained" || (track.status === "gap" && track.durationMs >= TRACK_SUSTAIN_MS);
  if (!sustained) return "candidate";
  if (stability === "zoom_verified" && zoom < 2) return "review";
  return "sustained";
}

function guideHotspot(point) {
  if (!point) return null;
  return { nx: point.nx, ny: point.ny, score: point.score, area: point.area };
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
  const trackRef = useRef(null);
  const measureRef = useRef(null);
  const lastMeasureAt = useRef(0);
  const announcedRef = useRef(new Set());
  const videoTrackRef = useRef(null);
  const flashGateRef = useRef(createFlashGate());
  const flashToken = useRef(0);
  const guideAbort = useRef(null);
  const runToken = useRef(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const audioStream = useRef(null);
  const lastGuideAt = useRef(0);
  const lastUiAt = useRef(0);
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
  const [torchInfo, setTorchInfo] = useState({ supported: false, checked: false, reason: "카메라 트랙 확인 전입니다." });
  const [torchLamp, setTorchLamp] = useState({ lit: false, confirmed: false, note: "" });
  const [flashUi, setFlashUi] = useState({ running: false, phase: "idle", report: null });

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
    const videoTrack = videoTrackRef.current;
    videoTrackRef.current = null;
    flashToken.current += 1;
    const gate = flashGateRef.current;
    gate.active = false;
    gate.phase = "idle";
    gate.busy = false;
    setFlashUi((prev) => ({ running: false, phase: prev.report ? "done" : "idle", report: prev.report }));
    const stream = videoRef.current?.srcObject;
    if (videoRef.current) videoRef.current.srcObject = null;
    void shutdownVideo(videoTrack, () => stopStream(stream)).then((result) => {
      if (!result?.torch?.attempted) {
        setTorchLamp({ lit: false, confirmed: false, note: "" });
        return;
      }
      if (result.torch.ok && result.torch.applied === false) setTorchLamp({ lit: false, confirmed: true, note: "손전등이 꺼져 있습니다." });
      else setTorchLamp({ lit: null, confirmed: false, note: result.torch.reason || "손전등이 꺼졌는지는 확인하지 못했습니다." });
    });
    stopStream(audioStream.current);
    audioStream.current = null;
    setRecording(false);
    trackRef.current = null;
    measureRef.current = null;
    lastMeasureAt.current = 0;
    announcedRef.current = new Set();
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
      if (trackRef.current || measureRef.current) {
        trackRef.current = null;
        measureRef.current = null;
        lastMeasureAt.current = 0;
        announcedRef.current = new Set();
      }
      const idleNow = performance.now();
      if (idleNow - lastUiAt.current > 180) {
        lastUiAt.current = idleNow;
        setReading({
          hotspot: null,
          cue: directionCue(null, z),
          locked: false,
          needZoom: false,
          rejected: "",
          rejectedWide: 0,
          limited: false,
          live: false,
          candidates: [],
          tracks: [],
          markers: []
        });
      }
      return;
    }
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const gate = flashGateRef.current;
    if (gate.active && current.optical) {
      if (tryBeginFlashSample(gate)) {
        try {
          const flashed = measureCandidates(frame, current.suppress);
          gate.samples.push({ at: new Date().toISOString(), candidates: flashed.candidates });
          measureRef.current = flashed;
        } finally {
          finishFlashSample(gate);
        }
      }
      applyOpticalPalette(frame, current.palette);
      ctx.putImageData(frame, 0, 0);
      return;
    }
    const now = performance.now();
    let measured = measureRef.current || { candidates: [], hotspot: null, rejected: "", rejectedWide: 0, limited: false };
    let trackState = trackRef.current || { tracks: [], ended: [], seq: 1 };
    if (!current.optical) {
      measured = { candidates: [], hotspot: null, rejected: "", rejectedWide: 0, limited: false };
      trackState = { tracks: [], ended: [], seq: trackState.seq || 1 };
      measureRef.current = measured;
      trackRef.current = trackState;
    } else if (now - lastMeasureAt.current >= MEASURE_INTERVAL_MS) {
      measured = measureCandidates(frame, current.suppress);
      trackState = updateCandidateTracks(trackState, measured.candidates, now);
      measureRef.current = measured;
      trackRef.current = trackState;
      lastMeasureAt.current = now;
    }
    applyOpticalPalette(frame, current.palette);
    ctx.putImageData(frame, 0, 0);
    const activeTracks = trackState.tracks || [];
    const sustained = activeTracks.filter((track) => track.status === "sustained" || (track.status === "gap" && track.durationMs >= TRACK_SUSTAIN_MS));
    const primary = sustained[0] || activeTracks[0] || measured.hotspot || null;
    const needZoom = current.stability === "zoom_verified" && sustained.length > 0 && z < 2;
    const markers = activeTracks.map((track) => {
      const kind = markerKind(track, current.stability, z);
      return { id: track.id, nx: track.nx, ny: track.ny, kind, label: MARK_LABEL[kind] };
    });
    const cue = directionCue(primary, z);
    if (now - lastUiAt.current > 180) {
      lastUiAt.current = now;
      setReading({
        hotspot: guideHotspot(primary),
        cue,
        locked: false,
        needZoom,
        rejected: measured.rejected || "",
        rejectedWide: measured.rejectedWide || 0,
        limited: Boolean(measured.limited),
        live,
        candidates: measured.candidates || [],
        tracks: activeTracks,
        markers
      });
    }
    if (current.stability !== "zoom_verified" || z >= 2) {
      const fresh = sustained.find((track) => !announcedRef.current.has(track.id));
      if (fresh) {
        announcedRef.current.add(fresh.id);
        void askGuide("lock", { hotspot: guideHotspot(fresh), needZoom: false });
      }
    }
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
      const videoTrack = stream.getVideoTracks?.()[0] || null;
      videoTrackRef.current = videoTrack;
      const support = readTorchSupport(videoTrack);
      setTorchInfo({ ...support, checked: true });
      setTorchLamp({ lit: false, confirmed: false, note: support.supported ? "" : support.reason });
      setFlashUi({ running: false, phase: "idle", report: null });
      setSampleMode(false);
      pushLog(support.supported ? "카메라 스트림을 열었습니다. 토치 제어를 사용할 수 있습니다." : "카메라 스트림을 열었습니다. 토치 제어는 사용할 수 없습니다.");
    } catch (err) {
      if (token !== runToken.current) return;
      setSampleMode(true);
      setTorchInfo({ supported: false, checked: true, reason: "카메라 프레임이 없어 토치를 확인하지 못했습니다. 조명 비교 불가." });
      setCameraError(err?.name === "NotAllowedError" ? "카메라 권한이 없습니다. 측정값을 만들지 않습니다." : "카메라를 열 수 없습니다. 측정값을 만들지 않습니다.");
      pushLog("카메라 프레임 없음");
    }
  }, [config.mode, pushLog, releaseMedia]);

  const runFlashAnalysis = useCallback(async () => {
    const token = flashToken.current + 1;
    flashToken.current = token;
    const track = videoTrackRef.current;
    const support = readTorchSupport(track);
    setTorchInfo({ ...support, checked: true });
    const gate = flashGateRef.current;
    gate.samples = [];
    gate.busy = false;
    gate.phase = "idle";
    if (!support.supported) {
      gate.active = false;
      const report = buildFlashReport({ support });
      setFlashUi({ running: false, phase: "idle", report });
      return report;
    }
    const video = videoRef.current;
    if (!video || video.readyState < 2 || sampleMode) {
      gate.active = false;
      const report = buildFlashReport({
        support,
        control: { ok: false, reason: "카메라 프레임이 없어 조명 비교를 시작하지 않았습니다. 조명 비교 불가." }
      });
      setFlashUi({ running: false, phase: "idle", report });
      return report;
    }
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const collectPhase = async (phase) => {
      gate.phase = "settle";
      gate.busy = false;
      setFlashUi((prev) => ({ ...prev, running: true, phase: "settle", report: null }));
      await wait(FLASH_SETTLE_MS);
      if (token !== flashToken.current) return null;
      const mark = gate.samples.length;
      gate.phase = phase;
      setFlashUi((prev) => ({ ...prev, running: true, phase, report: null }));
      await wait(FLASH_SAMPLE_MS);
      if (token !== flashToken.current) return null;
      return gate.samples.slice(mark);
    };
    gate.active = true;
    setFlashUi({ running: true, phase: "off", report: null });
    const offControl = await applyTorch(track, false);
    if (token !== flashToken.current) return null;
    if (!offControl.ok) {
      gate.active = false;
      gate.phase = "idle";
      setTorchLamp({ lit: null, confirmed: false, note: offControl.reason });
      const report = buildFlashReport({ support, control: offControl });
      setFlashUi({ running: false, phase: "idle", report });
      return report;
    }
    setTorchLamp({ lit: false, confirmed: true, note: "손전등이 꺼져 있습니다." });
    const offSamples = await collectPhase("off");
    if (!offSamples) return null;
    const onControl = await applyTorch(track, true);
    if (token !== flashToken.current) return null;
    if (!onControl.ok) {
      const back = await applyTorch(track, false);
      gate.active = false;
      gate.phase = "idle";
      setTorchLamp(back.ok && back.applied === false ? { lit: false, confirmed: true, note: "손전등이 꺼져 있습니다." } : { lit: null, confirmed: false, note: back.reason || onControl.reason });
      const report = buildFlashReport({ support, control: onControl, offPhase: summarizeFlashSamples(offSamples) });
      setFlashUi({ running: false, phase: "idle", report });
      return report;
    }
    setTorchLamp({ lit: true, confirmed: true, note: "손전등이 켜져 있습니다." });
    const onSamples = await collectPhase("on");
    const back = await applyTorch(track, false);
    if (token !== flashToken.current) return null;
    gate.active = false;
    gate.phase = "idle";
    setTorchLamp(back.ok && back.applied === false ? { lit: false, confirmed: true, note: "손전등이 꺼져 있습니다." } : { lit: null, confirmed: false, note: back.reason || "손전등이 꺼졌는지는 확인하지 못했습니다." });
    if (!onSamples) return null;
    if (!offSamples.length || !onSamples.length) {
      const report = buildFlashReport({
        support,
        control: { ok: false, reason: "조명 전환 전후 프레임을 모으지 못했습니다. 조명 비교 불가." },
        offPhase: summarizeFlashSamples(offSamples),
        onPhase: summarizeFlashSamples(onSamples)
      });
      setFlashUi({ running: false, phase: "idle", report });
      return report;
    }
    const report = buildFlashReport({
      support,
      offPhase: summarizeFlashSamples(offSamples),
      onPhase: summarizeFlashSamples(onSamples)
    });
    setFlashUi({ running: false, phase: "done", report });
    return report;
  }, [sampleMode]);

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
    askGuide,
    torch: torchInfo,
    torchLamp,
    flash: flashUi,
    runFlashAnalysis
  };
}
