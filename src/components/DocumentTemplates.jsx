import DocumentTemplatesPanel from "./DocumentTemplatesPanel.jsx";

export default function DocumentTemplates({ onGoMain, membershipTier = "free", isDarkMode = false }) {
  return (
    <section className="mx-auto w-full max-w-none flex-1 overflow-y-auto pb-28">
      <DocumentTemplatesPanel embedded={false} onGoBack={onGoMain} membershipTier={membershipTier} isDarkMode={isDarkMode} />
    </section>
  );
}
