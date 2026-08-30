import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download,
  FileImage,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import JSZip from "jszip";
import * as pdfjs from "pdfjs-dist";

// Vite-friendly worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export const Route = createFileRoute("/")({ component: Home });

type OutputFormat = "png" | "jpeg" | "webp";

interface PagePreview {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

const FORMAT_MIME: Record<OutputFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

const FORMAT_EXT: Record<OutputFormat, string> = {
  png: "png",
  jpeg: "jpg",
  webp: "webp",
};

function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(2);
  const [format, setFormat] = useState<OutputFormat>("png");
  const [quality, setQuality] = useState(0.92);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setPages([]);
    setProgress(0);
    setError(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const renderPdf = useCallback(
    async (source: File | ArrayBuffer, nameHint?: string) => {
      setBusy(true);
      setError(null);
      setPages([]);
      setProgress(0);

      try {
        const data =
          source instanceof File ? await source.arrayBuffer() : source;
        const loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        const total = pdf.numPages;
        const results: PagePreview[] = [];

        for (let i = 1; i <= total; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not get canvas context");

          await page.render({
            canvasContext: ctx,
            viewport,
            canvas,
          }).promise;

          const mime = FORMAT_MIME[format];
          const dataUrl =
            format === "png"
              ? canvas.toDataURL(mime)
              : canvas.toDataURL(mime, quality);

          results.push({
            pageNumber: i,
            dataUrl,
            width: canvas.width,
            height: canvas.height,
          });
          setProgress(Math.round((i / total) * 100));
          setPages([...results]);
        }

        if (source instanceof File) {
          setFile(source);
        } else if (nameHint) {
          setFile(new File([data], nameHint, { type: "application/pdf" }));
        }
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to render PDF. Try another file.",
        );
      } finally {
        setBusy(false);
      }
    },
    [scale, format, quality],
  );

  const onFile = useCallback(
    (f: File | null) => {
      if (!f) return;
      if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
        setError("Please choose a PDF file.");
        return;
      }
      void renderPdf(f);
    },
    [renderPdf],
  );

  // Re-render when scale / format / quality change and we already have a file
  useEffect(() => {
    if (file && !busy) {
      void renderPdf(file);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, format, quality]);

  const downloadOne = (page: PagePreview) => {
    const a = document.createElement("a");
    a.href = page.dataUrl;
    a.download = `${(file?.name ?? "page").replace(/\.pdf$/i, "")}-p${page.pageNumber}.${FORMAT_EXT[format]}`;
    a.click();
  };

  const downloadAll = async () => {
    if (pages.length === 0) return;
    if (pages.length === 1) {
      downloadOne(pages[0]);
      return;
    }
    const zip = new JSZip();
    const base = (file?.name ?? "pages").replace(/\.pdf$/i, "");
    for (const p of pages) {
      const b64 = p.dataUrl.split(",")[1];
      zip.file(`${base}-p${p.pageNumber}.${FORMAT_EXT[format]}`, b64, {
        base64: true,
      });
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base}-images.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadSample = async () => {
    try {
      setBusy(true);
      const res = await fetch("/sample.pdf");
      if (!res.ok) throw new Error("Sample PDF not found");
      const buf = await res.arrayBuffer();
      await renderPdf(buf, "sample.pdf");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load sample");
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl ink-gradient flex items-center justify-center shadow-lg shadow-amber-500/20">
              <FileImage className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">InkShift</h1>
              <p className="text-xs text-zinc-500">PDF → images in the browser</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>No upload · private</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Drop zone */}
        {!pages.length && !busy && (
          <section
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) onFile(f);
            }}
            className={`relative rounded-2xl border-2 border-dashed transition-colors p-12 text-center ${
              dragOver
                ? "border-amber-400 bg-amber-500/5"
                : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/40"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <div className="pointer-events-none flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
                <Upload className="w-7 h-7 text-zinc-400" />
              </div>
              <div>
                <p className="text-lg font-medium">Drop a PDF here</p>
                <p className="text-sm text-zinc-500 mt-1">
                  or click to browse · max practical size depends on your device
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  void loadSample();
                }}
                className="pointer-events-auto mt-2 text-sm text-amber-400 hover:text-amber-300 underline-offset-4 hover:underline"
              >
                Try the sample PDF
              </button>
            </div>
          </section>
        )}

        {/* Controls when we have content or are busy */}
        {(pages.length > 0 || busy || error) && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {file?.name ?? "Rendering…"}
                </p>
                <p className="text-xs text-zinc-500">
                  {pages.length > 0
                    ? `${pages.length} page${pages.length === 1 ? "" : "s"}`
                    : busy
                      ? "Working…"
                      : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={reset}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => void downloadAll()}
                  disabled={busy || pages.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 text-zinc-950 font-medium px-3 py-1.5 text-sm hover:bg-amber-400 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {pages.length > 1 ? "Download ZIP" : "Download"}
                </button>
              </div>
            </div>

            {busy && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rendering pages… {progress}%
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full ink-gradient transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-3 py-2">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-400">
                  Scale (DPI-ish)
                </span>
                <select
                  value={scale}
                  onChange={(e) => setScale(Number(e.target.value))}
                  disabled={busy}
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value={1}>1× (~72 dpi)</option>
                  <option value={1.5}>1.5×</option>
                  <option value={2}>2× (~144 dpi)</option>
                  <option value={2.5}>2.5×</option>
                  <option value={3}>3× (~216 dpi)</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-400">Format</span>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as OutputFormat)}
                  disabled={busy}
                  className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="png">PNG (lossless)</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-zinc-400">
                  Quality {format === "png" ? "(n/a)" : `(${Math.round(quality * 100)}%)`}
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.01}
                  value={quality}
                  disabled={busy || format === "png"}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-amber-500 disabled:opacity-40"
                />
              </label>
            </div>
          </section>
        )}

        {/* Page grid */}
        {pages.length > 0 && (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {pages.map((p) => (
              <article
                key={p.pageNumber}
                className="group rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden flex flex-col"
              >
                <div className="relative bg-zinc-950 aspect-[3/4] flex items-center justify-center p-3">
                  <img
                    src={p.dataUrl}
                    alt={`Page ${p.pageNumber}`}
                    className="max-w-full max-h-full object-contain shadow-lg shadow-black/40 rounded"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => downloadOne(p)}
                      className="inline-flex items-center gap-2 rounded-lg bg-white text-zinc-900 font-medium px-3 py-2 text-sm shadow-lg"
                    >
                      <Download className="w-4 h-4" />
                      Save page
                    </button>
                  </div>
                </div>
                <div className="px-3 py-2.5 flex items-center justify-between text-xs text-zinc-400 border-t border-zinc-800">
                  <span className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Page {p.pageNumber}
                  </span>
                  <span>
                    {p.width}×{p.height}
                  </span>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* Empty state tip */}
        {!pages.length && !busy && !error && (
          <p className="text-center text-sm text-zinc-600 max-w-md mx-auto">
            All conversion runs locally with PDF.js. Your files never leave this
            device.
          </p>
        )}
      </main>

      <footer className="border-t border-zinc-900 py-4 text-center text-xs text-zinc-600">
        InkShift · client-side only
      </footer>
    </div>
  );
}
