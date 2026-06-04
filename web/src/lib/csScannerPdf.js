/**
 * 촬영 이미지(data URL) 배열 → PDF Blob (jspdf 지연 로드)
 * @param {string[]} imageDataUrls
 * @returns {Promise<Blob>}
 */
export async function buildScanPdfBlob(imageDataUrls) {
  const pages = (imageDataUrls || []).filter(Boolean);
  if (!pages.length) throw new Error("스캔할 이미지가 없습니다.");

  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;

  pages.forEach((dataUrl, index) => {
    if (index > 0) pdf.addPage();
    const format = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
    const props = pdf.getImageProperties(dataUrl);
    const ratio = Math.min(pageW / props.width, pageH / props.height);
    const w = props.width * ratio;
    const h = props.height * ratio;
    pdf.addImage(dataUrl, format, (pageW - w) / 2, (pageH - h) / 2, w, h, undefined, "FAST");
  });

  return pdf.output("blob");
}
