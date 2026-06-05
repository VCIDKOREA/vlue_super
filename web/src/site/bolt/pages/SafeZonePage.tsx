import { useState } from 'react';
import { MapPin, Plus, Trash2, Home, Briefcase, Heart, BookOpen, Settings, ArrowLeft, Info } from 'lucide-react';
import type { SafeZone } from '../types';

interface SafeZonePageProps {
  onBack: () => void;
}

const ZONE_TYPES = [
  { type: 'home' as const, label: '집', icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { type: 'work' as const, label: '직장', icon: Briefcase, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-200' },
  { type: 'hospital' as const, label: '병원', icon: Heart, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200' },
  { type: 'school' as const, label: '학교', icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { type: 'custom' as const, label: '사용자 지정', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
];

const INITIAL_ZONES: SafeZone[] = [
  { id: 'sz-1', label: '우리집', x: 35, y: 40, radius: 12, type: 'home' },
  { id: 'sz-2', label: '직장', x: 65, y: 30, radius: 10, type: 'work' },
];

export default function SafeZonePage({ onBack }: SafeZonePageProps) {
  const [zones, setZones] = useState<SafeZone[]>(INITIAL_ZONES);
  const [addMode, setAddMode] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<SafeZone['type']>('home');

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!addMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const defaultLabel = ZONE_TYPES.find((t) => t.type === newType)?.label ?? '안심영역';
    const newZone: SafeZone = {
      id: `sz-${Date.now()}`,
      label: newLabel || defaultLabel,
      x,
      y,
      radius: 10,
      type: newType,
    };
    setZones((prev) => [...prev, newZone]);
    setAddMode(false);
    setNewLabel('');
  };

  const removeZone = (id: string) => {
    setZones((prev) => prev.filter((z) => z.id !== id));
    if (selected === id) setSelected(null);
  };

  return (
    <main className="min-h-screen bg-gray-50 pt-16">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">위치기반 안심영역 설정</h1>
            <p className="text-gray-400 text-xs">자주 방문하는 안심 장소를 등록하여 맞춤 보이스피싱 경보를 받으세요.</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-700">지도 미리보기</span>
                <button
                  onClick={() => setAddMode(!addMode)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    addMode ? 'bg-primary-600 text-white' : 'btn-secondary py-1.5 px-3 text-xs'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {addMode ? '지도 클릭으로 추가' : '영역 추가'}
                </button>
              </div>

              <div
                className={`relative bg-blue-light overflow-hidden ${addMode ? 'cursor-crosshair' : 'cursor-default'}`}
                style={{ height: '400px' }}
                onClick={handleMapClick}
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `linear-gradient(rgba(0,71,171,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(0,71,171,0.15) 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-32 h-32 rounded-full bg-primary-100/40 border border-primary-200/30 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-primary-300" />
                  </div>
                </div>

                {zones.map((zone) => {
                  const cfg = ZONE_TYPES.find((t) => t.type === zone.type);
                  const Icon = cfg ? cfg.icon : MapPin;
                  return (
                    <div
                      key={zone.id}
                      className="absolute"
                      style={{ left: `${zone.x}%`, top: `${zone.y}%`, transform: 'translate(-50%, -50%)' }}
                      onClick={(e) => { e.stopPropagation(); setSelected(zone.id); }}
                    >
                      <div
                        className={`relative w-9 h-9 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-transform hover:scale-110 ${
                          selected === zone.id ? 'ring-2 ring-primary-500 ring-offset-1' : ''
                        } ${cfg ? cfg.bg : 'bg-gray-50'} border ${cfg ? cfg.border : 'border-gray-200'}`}
                      >
                        <Icon className={`w-4 h-4 ${cfg ? cfg.color : 'text-gray-600'}`} />
                      </div>
                      <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-xs font-semibold text-gray-700 whitespace-nowrap shadow-sm">
                        {zone.label}
                      </div>
                    </div>
                  );
                })}

                {addMode && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-primary-600 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg">
                      지도를 클릭하여 안심영역 추가
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {addMode && (
              <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4">
                <h3 className="text-primary-800 font-semibold text-sm mb-3">새 안심영역 설정</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1">영역 이름</label>
                    <input
                      type="text"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      placeholder="예: 우리 동네"
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 block mb-1.5">영역 유형</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {ZONE_TYPES.map(({ type, label, icon: ZIcon, color, bg, border }) => (
                        <button
                          key={type}
                          onClick={() => setNewType(type)}
                          className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all ${
                            newType === type ? `${bg} ${border} ${color}` : 'bg-white border-gray-200 text-gray-500'
                          }`}
                        >
                          <ZIcon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-card">
              <h3 className="text-gray-900 font-semibold text-sm mb-3">등록된 안심영역</h3>
              {zones.length === 0 ? (
                <p className="text-gray-400 text-xs text-center py-4">등록된 안심영역이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {zones.map((zone) => {
                    const cfg = ZONE_TYPES.find((t) => t.type === zone.type);
                    const Icon = cfg ? cfg.icon : MapPin;
                    return (
                      <div
                        key={zone.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          selected === zone.id ? 'border-primary-300 bg-primary-50' : 'border-gray-100 hover:border-gray-200'
                        }`}
                        onClick={() => setSelected(zone.id === selected ? null : zone.id)}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg ? cfg.bg : 'bg-gray-50'} border ${cfg ? cfg.border : 'border-gray-200'}`}>
                          <Icon className={`w-3.5 h-3.5 ${cfg ? cfg.color : 'text-gray-600'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900 text-sm font-medium truncate">{zone.label}</p>
                          <p className="text-gray-400 text-xs">{cfg ? cfg.label : '사용자 지정'}</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); removeZone(zone.id); }}
                          className="p-1 text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-blue-light border border-primary-100 rounded-2xl p-4 flex gap-2">
              <Info className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
              <p className="text-primary-700 text-xs leading-relaxed">
                안심영역 등록 시 해당 지역에서 의심 전화가 올 때 우선 경보를 받을 수 있습니다. 프리미엄 요금제에서는 무제한으로 등록 가능합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
