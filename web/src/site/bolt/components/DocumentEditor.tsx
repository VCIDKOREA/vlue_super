import { useState, useRef } from 'react';
import { X, Printer, Save, ChevronDown, AlertCircle } from 'lucide-react';
import SensitiveRightClickGuard from './SensitiveRightClickGuard';

interface TemplateField {
  key: string;
  label: string;
  type: 'text' | 'date' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
  required: boolean;
  autoFill?: 'name';
}

interface DocumentEditorProps {
  title: string;
  category: string;
  fields: TemplateField[];
  userName?: string;
  onClose: () => void;
}

export default function DocumentEditor({ title, category, fields, userName, onClose }: DocumentEditorProps) {
  const initialValues: Record<string, string> = {};
  fields.forEach((f) => {
    if (f.autoFill === 'name' && userName) {
      initialValues[f.key] = userName;
    } else {
      initialValues[f.key] = '';
    }
  });

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [saved, setSaved] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const fieldsHtml = fields.map((f) => {
      const val = values[f.key] || '';
      return `
        <tr>
          <td style="width:30%;padding:8px 12px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;color:#374151;vertical-align:top;">${f.label}${f.required ? ' *' : ''}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:13px;color:#111827;white-space:pre-wrap;min-height:32px;">${val || '&nbsp;'}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          * { box-sizing: border-box; }
          body { font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif; color: #111; margin: 0; padding: 0; }
          .doc-header { text-align: center; margin-bottom: 28px; padding-bottom: 16px; border-bottom: 2px solid #1e40af; }
          .doc-category { font-size: 12px; color: #6b7280; margin-bottom: 6px; letter-spacing: 0.05em; }
          .doc-title { font-size: 22px; font-weight: 800; color: #111827; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .doc-footer { margin-top: 36px; text-align: center; font-size: 11px; color: #9ca3af; }
          .signed-area { margin-top: 40px; display: flex; justify-content: flex-end; gap: 48px; }
          .sign-box { text-align: center; font-size: 13px; }
          .sign-line { width: 120px; height: 60px; border: 1px solid #e5e7eb; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="doc-header">
          <div class="doc-category">${category}</div>
          <div class="doc-title">${title}</div>
        </div>
        <table>${fieldsHtml}</table>
        <div class="signed-area">
          <div class="sign-box">작성자<div class="sign-line"></div></div>
          <div class="sign-box">검토자<div class="sign-line"></div></div>
          <div class="sign-box">결재자<div class="sign-line"></div></div>
        </div>
        <div class="doc-footer">본 문서는 VLUE 자료실에서 작성되었습니다.</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <SensitiveRightClickGuard className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <span className="text-xs text-gray-400 font-medium">{category}</span>
            <h2 className="text-gray-900 font-bold text-lg leading-tight" style={{ letterSpacing: '-0.02em' }}>{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                saved ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Save className="w-4 h-4" />
              {saved ? '저장됨' : '저장'}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-primary-600 text-white hover:bg-primary-700 transition-all"
            >
              <Printer className="w-4 h-4" />
              인쇄
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {userName && (
          <div className="px-7 py-3 bg-blue-50 border-b border-blue-100 flex items-center gap-2 flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-primary-500 flex-shrink-0" />
            <p className="text-primary-700 text-xs font-medium">
              회원 이름 <strong>{userName}</strong>이(가) 자동으로 입력되었습니다. 필요 시 수정하세요.
            </p>
          </div>
        )}

        <div ref={printRef} className="overflow-y-auto flex-1 px-7 py-6">
          <div className="grid grid-cols-1 gap-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  {f.label}
                  {f.required && <span className="text-red-500 ml-0.5">*</span>}
                  {f.autoFill === 'name' && userName && (
                    <span className="ml-2 text-primary-500 font-medium text-xs">(자동입력)</span>
                  )}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    value={values[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all resize-none"
                  />
                ) : f.type === 'select' ? (
                  <div className="relative">
                    <select
                      value={values[f.key]}
                      onChange={(e) => handleChange(f.key, e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all appearance-none bg-white pr-9"
                    >
                      <option value="">선택하세요</option>
                      {f.options?.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                ) : (
                  <input
                    type={f.type}
                    value={values[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-7 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-400">* 표시는 필수 항목입니다.</p>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            인쇄하기
          </button>
        </div>
      </SensitiveRightClickGuard>
    </div>
  );
}
