import { prisma } from "../../db/client.js";
import { loadEnterpriseUserContext } from "../enterprise/enterpriseContext.js";
import { roleLabelKo } from "../enterprise/enterpriseRoles.js";

export async function buildTaxExportCsv(enterpriseGroupId: string) {
  const rows = await prisma.shopOrder.findMany({
    where: { enterpriseGroupId, status: "paid" },
    orderBy: { paidAt: "asc" },
    include: {
      buyer: { select: { legalName: true, publicHandle: true, enterpriseRole: true } }
    }
  });

  const ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId: enterpriseGroupId },
    select: { companyName: true }
  });

  const header = [
    "결제일",
    "주문번호",
    "품목",
    "수량",
    "단가",
    "배송비",
    "합계",
    "결제수단",
    "회사예산",
    "결제자",
    "결제자역할"
  ].join(",");

  const body = rows.map((r) => {
    const paidAt = r.paidAt ? r.paidAt.toISOString().slice(0, 10) : "";
    const cols = [
      paidAt,
      r.merchantUid,
      `"${r.productName.replace(/"/g, '""')}"`,
      r.quantity,
      r.unitPriceKrw,
      r.shippingFeeKrw,
      r.totalAmountKrw,
      r.payMethod || "",
      r.paidByEnterpriseWallet ? "Y" : "N",
      `"${(r.buyer.legalName || r.buyer.publicHandle || "").replace(/"/g, '""')}"`,
      roleLabelKo(r.buyer.enterpriseRole)
    ];
    return cols.join(",");
  });

  const bom = "\uFEFF";
  return {
    filename: `${(ent?.companyName || "enterprise").replace(/\s/g, "_")}_tax_export.csv`,
    content: bom + [header, ...body].join("\n")
  };
}

export async function buildTaxExportHtml(enterpriseGroupId: string) {
  const ctx = await loadEnterpriseUserContext(enterpriseGroupId);
  const rows = await prisma.shopOrder.findMany({
    where: { enterpriseGroupId, status: "paid" },
    orderBy: { paidAt: "asc" },
    include: {
      buyer: { select: { legalName: true, publicHandle: true, enterpriseRole: true } }
    }
  });

  const ent = await prisma.b2BEnterpriseAccount.findFirst({
    where: { adminUserId: enterpriseGroupId },
    select: { companyName: true }
  });

  const company = ent?.companyName || "기업";
  const total = rows.reduce((s, r) => s + r.totalAmountKrw, 0);

  const tr = rows
    .map(
      (r) => `<tr>
        <td>${r.paidAt ? r.paidAt.toISOString().slice(0, 10) : ""}</td>
        <td>${r.merchantUid}</td>
        <td>${escapeHtml(r.productName)}</td>
        <td>${r.quantity}</td>
        <td style="text-align:right">${r.unitPriceKrw.toLocaleString("ko-KR")}</td>
        <td style="text-align:right">${r.totalAmountKrw.toLocaleString("ko-KR")}</td>
        <td>${escapeHtml(r.buyer.legalName || r.buyer.publicHandle || "")}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"/>
<title>${escapeHtml(company)} 매입 증빙</title>
<style>
body{font-family:Malgun Gothic,sans-serif;padding:24px;color:#111}
h1{font-size:18px;margin:0 0 8px}
table{border-collapse:collapse;width:100%;font-size:12px;margin-top:16px}
th,td{border:1px solid #ccc;padding:6px 8px}
th{background:#f3f4f6}
.total{margin-top:12px;font-weight:bold}
@media print{button{display:none}}
</style></head><body>
<h1>${escapeHtml(company)} — VLUE 사내 구매 매입 증빙</h1>
<p>발행일 ${new Date().toISOString().slice(0, 10)} · 건수 ${rows.length} · 합계 ${total.toLocaleString("ko-KR")}원</p>
<button onclick="window.print()">PDF로 저장(인쇄)</button>
<table>
<thead><tr><th>결제일</th><th>주문번호</th><th>품목</th><th>수량</th><th>단가</th><th>합계</th><th>결제자</th></tr></thead>
<tbody>${tr || "<tr><td colspan='7'>결제 내역 없음</td></tr>"}</tbody>
</table>
<p class="total">총 ${total.toLocaleString("ko-KR")}원</p>
</body></html>`;
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function assertTaxExportAccess(viewerUserId: string) {
  const ctx = await loadEnterpriseUserContext(viewerUserId);
  if (!ctx?.enterpriseGroupId) throw new Error("기업 소속이 아닙니다.");
  if (ctx.enterpriseRole !== "MASTER" && ctx.enterpriseRole !== "MANAGER" && ctx.enterpriseRole !== "BUYER") {
    throw new Error("세금 증빙은 대표·대리인·경리만 다운로드할 수 있습니다.");
  }
  return ctx.enterpriseGroupId;
}
