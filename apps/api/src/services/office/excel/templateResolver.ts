import {
  parseWorkbookModel,
  safeParseWorkbookModel,
  type VlueWorkbookModel
} from "@vlue/shared/excel";
import {
  getFallbackTemplateById,
  OFFICE_EXCEL_TEMPLATES_FALLBACK
} from "../../../data/officeExcelTemplatesCatalog.js";
import { prisma } from "../../../db/client.js";

export async function resolveTemplateModel(templateId: string): Promise<VlueWorkbookModel | null> {
  const row = await prisma.officeExcelTemplate.findFirst({
    where: { id: templateId, isActive: true }
  });
  if (row) {
    const parsed = safeParseWorkbookModel(row.modelJson);
    if (parsed.success) return parsed.data;
  }
  const fb = getFallbackTemplateById(templateId);
  return fb ? parseWorkbookModel(fb.model) : null;
}

export async function listExcelTemplates() {
  const rows = await prisma.officeExcelTemplate.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" }
  });
  if (rows.length > 0) {
    return rows.map((r) => ({
      id: r.id,
      category: r.category,
      title: r.title,
      description: r.description,
      promptHints: (r.promptHints as string[] | null) ?? []
    }));
  }
  return OFFICE_EXCEL_TEMPLATES_FALLBACK.map((t) => ({
    id: t.id,
    category: t.category,
    title: t.title,
    description: t.description,
    promptHints: t.promptHints
  }));
}
