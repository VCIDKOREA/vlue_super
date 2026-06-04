/** 음성 메시지 재생 파형 — 상대/내 메시지 공용 */

export default function VoiceWaveform({ active = false, isMe = false, bars = 12 }) {
  return (
    <div className="flex h-5 items-end gap-[2px]" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full transition-all ${
            active ? "voice-wave-bar--active" : ""
          } ${isMe ? "bg-blue-200" : "bg-gray-300"}`}
          style={{
            height: `${6 + ((i * 7) % 14)}px`,
            animationDelay: active ? `${i * 55}ms` : undefined
          }}
        />
      ))}
    </div>
  );
}
