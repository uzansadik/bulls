/**
 * @openbulls/reports — renderReport orchestration tests.
 *
 * Mocks \`IReportRepository\` + \`IStorageAdapter\` (no Postgres, no
 * S3). Coverage:
 *   - happy path: insert → render → upload → markReady
 *   - unknown format → InvalidReportParametersError-class code
 *   - invalid parameters → same
 *   - unknown reportType (freeform) → falls back to \`custom\`
 *   - renderer throws → markFailed, ReportRenderError surfaces
 *   - upload throws → markFailed, ReportUploadError surfaces
 *   - unknown title → defaultTitleFor fills in
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Report } from "@openbulls/db/schema/reports.schema";
import {
  StorageKey,
  StorageKeyNotFoundError,
  type IStorageAdapter,
  type StorageKey as StorageKeyT,
} from "@openbulls/storage";

import {
  InvalidReportParametersError,
  ReportRenderError,
  ReportUploadError,
  TemplateMissingError,
  UnknownReportFormatError,
  renderReport,
  type NewReportInput,
} from "../index";
import type { IReportRepository } from "../infrastructure/repositories/ports";

// Mock logger.
const noopLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

let insertedRow: Report;
let readyRow: Report;
const repo: IReportRepository = {
  insert: vi.fn(async (input: NewReportInput): Promise<Report> => {
    insertedRow = {
      id: "rep-1",
      userId: input.userId,
      portfolioId: input.portfolioId ?? null,
      title: input.title,
      reportType: input.reportType,
      format: input.format,
      status: input.status,
      storageKey: null,
      parameters: input.parameters,
      generatedAt: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Report;
    return insertedRow;
  }),
  getById: vi.fn(async (id: string) => (id === "rep-1" ? readyRow : null)),
  listByUser: vi.fn(async () => []),
  markGenerating: vi.fn(async (id: string) => {
    void id;
    return insertedRow;
  }),
  markReady: vi.fn(async (id: string, storageKey: string, _size: number) => {
    readyRow = {
      ...insertedRow,
      id,
      status: "ready",
      storageKey,
      generatedAt: new Date(),
    } as Report;
    return readyRow;
  }),
  markFailed: vi.fn(async (id: string, reason: string) => {
    void id;
    void reason;
    return { ...insertedRow, status: "failed" } as Report;
  }),
};

const storageUpload = vi.fn(async () => ({
  key: StorageKey("reports/u-1/rep-1.pdf"),
  size: 12,
  contentType: "application/pdf" as const,
  uploadedAt: new Date(),
}));
const storage: IStorageAdapter = {
  backend: "local-fs" as const,
  upload: storageUpload as never,
  download: vi.fn(async () => new Uint8Array()),
  stat: vi.fn(async () => ({
    key: StorageKey("k"),
    size: 0,
    contentType: "application/octet-stream" as const,
    uploadedAt: new Date(),
  })),
  presign: vi.fn(async () => ({ url: "file:///x", expiresAt: new Date() })),
  exists: vi.fn(async () => true),
  remove: vi.fn(async () => undefined),
  openReadStream: vi.fn(async () => {
    throw new StorageKeyNotFoundError("no stream in test", { key: "k" });
  }),
};

const fixedNow = () => new Date("2026-07-10T00:00:00.000Z");
const renderOk: () => Promise<{ contentType: string; render: () => Promise<Buffer> }> = () =>
  Promise.resolve({
    contentType: "application/pdf",
    render: () => Promise.resolve(Buffer.from("PDF-stub")),
  });

beforeEach(() => {
  vi.mocked(repo.insert).mockClear();
  vi.mocked(repo.markReady).mockClear();
  vi.mocked(repo.markFailed).mockClear();
  storageUpload.mockClear();
});

describe("renderReport", () => {
  it("happy path: insert → render → upload → markReady", async () => {
    const out = await renderReport(
      {
        repo,
        storage,
        now: fixedNow,
        logger: noopLogger,
        resolveRenderer: renderOk,
      },
      {
        userId: "u-1",
        reportType: "portfolio_review",
        format: "pdf",
        parameters: { portfolioId: "p-1" },
        title: "My weekly review",
      },
    );

    expect(out.reportId).toBe("rep-1");
    expect(out.storageKey).toContain("reports/u-1/rep-1");
    expect(out.size).toBe(Buffer.from("PDF-stub").byteLength);
    expect(repo.insert).toHaveBeenCalledOnce();
    expect(storageUpload).toHaveBeenCalledOnce();
    expect(repo.markReady).toHaveBeenCalledOnce();
  });

  it("rejects unknown format", async () => {
    await expect(
      renderReport(
        {
          repo,
          storage,
          now: fixedNow,
          logger: noopLogger,
          resolveRenderer: renderOk,
        },
        {
          userId: "u-1",
          reportType: "portfolio_review",
          // @ts-expect-error: bad-format is intentionally invalid
          format: "html",
          parameters: {},
        },
      ),
    ).rejects.toBeInstanceOf(UnknownReportFormatError);
  });

  it("rejects when parameters fail schema validation", async () => {
    // Pass parameters as a non-record to trigger Zod failure.
    await expect(
      renderReport(
        {
          repo,
          storage,
          now: fixedNow,
          logger: noopLogger,
          resolveRenderer: renderOk,
        },
        {
          userId: "u-1",
          reportType: "portfolio_review",
          format: "pdf",
          // @ts-expect-error: invalid shape on purpose
          parameters: "not-an-object",
        },
      ),
    ).rejects.toBeInstanceOf(InvalidReportParametersError);
  });

  it("falls back to `custom` for unknown reportType (freeform)", async () => {
    const customRow = { ...insertedRow };
    await renderReport(
      {
        repo,
        storage,
        now: fixedNow,
        logger: noopLogger,
        resolveRenderer: async () => ({
          contentType: "application/pdf",
          render: () => Promise.resolve(Buffer.from("x")),
        }),
      },
      {
        userId: "u-1",
        reportType: "experimental_signal",
        format: "pdf",
        parameters: {},
      },
    );
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ reportType: "custom" }),
    );
    void customRow;
  });

  it("marks row failed when renderer throws and rethrows as ReportRenderError", async () => {
    const throwingResolver = async () => ({
      contentType: "application/pdf",
      render: () => Promise.reject(new Error("template missing")),
    });
    await expect(
      renderReport(
        {
          repo,
          storage,
          now: fixedNow,
          logger: noopLogger,
          resolveRenderer: throwingResolver,
        },
        {
          userId: "u-1",
          reportType: "portfolio_review",
          format: "pdf",
          parameters: {},
        },
      ),
    ).rejects.toBeInstanceOf(ReportRenderError);
    expect(repo.markFailed).toHaveBeenCalledOnce();
  });

  it("marks row failed when resolveRenderer returns nothing", async () => {
    await expect(
      renderReport(
        {
          repo,
          storage,
          now: fixedNow,
          logger: noopLogger,
          resolveRenderer: (async () => {
            throw new Error("no renderer");
          }) as never,
        },
        {
          userId: "u-1",
          reportType: "portfolio_review",
          format: "pdf",
          parameters: {},
        },
      ),
    ).rejects.toBeInstanceOf(TemplateMissingError);
    expect(repo.markFailed).toHaveBeenCalledOnce();
  });

  it("marks row failed when upload throws and rethrows as ReportUploadError", async () => {
    const storageBad: IStorageAdapter = {
      ...storage,
      upload: (async () => {
        throw new StorageKeyNotFoundError("key not found", { key: "k" });
      }) as never,
    };
    await expect(
      renderReport(
        {
          repo,
          storage: storageBad,
          now: fixedNow,
          logger: noopLogger,
          resolveRenderer: renderOk,
        },
        {
          userId: "u-1",
          reportType: "portfolio_review",
          format: "pdf",
          parameters: {},
        },
      ),
    ).rejects.toBeInstanceOf(ReportUploadError);
    expect(repo.markFailed).toHaveBeenCalledOnce();
  });

  it("uses defaultTitleFor when title is not supplied", async () => {
    await renderReport(
      {
        repo,
        storage,
        now: fixedNow,
        logger: noopLogger,
        resolveRenderer: renderOk,
      },
      {
        userId: "u-1",
        reportType: "company_analysis",
        format: "pdf",
        parameters: { symbol: "THYAO" },
      },
    );
    expect(repo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ title: "company_analysis — THYAO" }),
    );
  });
});