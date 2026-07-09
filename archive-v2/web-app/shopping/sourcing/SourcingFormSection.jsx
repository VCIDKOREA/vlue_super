export default function SourcingFormSection({
  id,
  title,
  required = false,
  complete = false,
  isDarkMode = false,
  children,
  className = ""
}) {
  const panel = isDarkMode ? "border-white/10 bg-[#151821]" : "border-slate-200 bg-white";
  const head = isDarkMode ? "text-gray-100" : "text-slate-900";

  return (
    <section
      id={id ? `sourcing-section-${id}` : undefined}
      className={`rounded-xl border p-4 shadow-sm ${panel} ${className}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <h3 className={`text-[14px] font-bold ${head}`}>
          {title}
          {required ? <span className="text-rose-500"> *</span> : null}
        </h3>
        {complete ? (
          <span className={`text-[12px] font-bold ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>✓</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}
