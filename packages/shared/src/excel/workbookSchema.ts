import { z } from "zod";

export const cellValueSchema = z.object({
  v: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
  f: z.string().optional(),
  s: z.union([z.string(), z.record(z.unknown())]).optional()
});

export const sheetSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(100),
  rowCount: z.number().int().min(1).max(10_000),
  columnCount: z.number().int().min(1).max(200),
  cellData: z.record(z.string(), cellValueSchema).default({}),
  merges: z
    .array(
      z.object({
        r: z.number().int().min(0),
        c: z.number().int().min(0),
        rs: z.number().int().min(1),
        cs: z.number().int().min(1)
      })
    )
    .optional(),
  columnWidths: z.record(z.string(), z.number()).optional()
});

export const workbookMetaSchema = z.object({
  title: z.string().min(1).max(300),
  templateId: z.string().max(80).optional(),
  locale: z.literal("ko-KR").default("ko-KR"),
  createdBy: z.enum(["ai", "user", "import"]).default("user")
});

export const vlueWorkbookModelSchema = z.object({
  meta: workbookMetaSchema,
  sheets: z.array(sheetSchema).min(1).max(20),
  namedRanges: z.record(z.string(), z.string()).optional()
});

export type VlueWorkbookModel = z.infer<typeof vlueWorkbookModelSchema>;
export type VlueWorkbookSheet = z.infer<typeof sheetSchema>;
export type VlueCellValue = z.infer<typeof cellValueSchema>;

/** 빈 워크북 스켈레ton */
export function createEmptyWorkbookModel(title: string): VlueWorkbookModel {
  return {
    meta: {
      title: title.slice(0, 300),
      locale: "ko-KR",
      createdBy: "user"
    },
    sheets: [
      {
        id: "sheet1",
        name: "Sheet1",
        rowCount: 100,
        columnCount: 26,
        cellData: {
          r0c0: { v: "항목" },
          r0c1: { v: "값" }
        }
      }
    ]
  };
}

export function parseWorkbookModel(input: unknown): VlueWorkbookModel {
  return vlueWorkbookModelSchema.parse(input);
}

export function safeParseWorkbookModel(input: unknown) {
  return vlueWorkbookModelSchema.safeParse(input);
}
