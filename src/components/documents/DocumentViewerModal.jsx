import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowsOutLineHorizontalIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CornersInIcon,
  DownloadSimpleIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";
import { Button, Message } from "@majistudio/ogcr-design-system";
import Dialog from "../ui/Dialog";
import Loader from "../ui/Loader";
import ImageView from "./ImageView";
import PdfPages from "./PdfPages";
import { previewKindOf } from "./previewable";
import { useToast } from "../providers/ToastContext";
import $documents from "../../services/$documents";
import $auth from "../../services/$auth";

const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4];

const nextZoom = (scale) => ZOOM_STEPS.find((step) => step > scale + 0.01) ?? ZOOM_STEPS.at(-1);
const previousZoom = (scale) => ZOOM_STEPS.findLast((step) => step < scale - 0.01) ?? ZOOM_STEPS[0];

function describeError(err) {
  if (err?.name === "PasswordException") {
    return "This PDF is password protected. Download it and open it in a PDF reader.";
  }
  if (err?.name === "InvalidPDFException") {
    return "The file is damaged or is not a valid PDF. Download it to inspect it.";
  }
  return $auth.getErrorMessage(err);
}

function ToolButton({ label, onClick, disabled, pressed, children, className = "" }) {
  return (
    <button
      type="button"
      className={`ogcr-doc-viewer__tool ${className}`.trim()}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** "3 / 12", where the 3 is an input that jumps to the page typed into it. */
function PageJump({ page, pageCount, onJump, disabled }) {
  const [draft, setDraft] = useState(null);

  const commit = () => {
    const number = Number.parseInt(draft, 10);
    if (Number.isFinite(number)) onJump(Math.min(Math.max(number, 1), pageCount));
    setDraft(null);
  };

  return (
    <label className="ogcr-doc-viewer__page-jump">
      <span className="sr-only">Page</span>
      <input
        type="text"
        inputMode="numeric"
        className="ogcr-doc-viewer__page-input"
        value={draft ?? String(page)}
        disabled={disabled}
        size={Math.max(String(pageCount).length, 1)}
        onFocus={(event) => event.target.select()}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") {
            // Undo the edit; the modal closes on the next Escape.
            event.stopPropagation();
            setDraft(null);
            event.currentTarget.blur();
          }
        }}
      />
      <span className="ogcr-doc-viewer__page-total" aria-hidden="true">/ {pageCount || "–"}</span>
      <span className="sr-only">of {pageCount}</span>
    </label>
  );
}

/**
 * Read a document without saving it. Files are private, so the viewer fetches
 * the blob once with the auth header and draws it itself: PDFs through pdf.js,
 * images as they are. The same blob is what "Download" saves.
 */
function DocumentViewerModal({ document: doc, kindLabel, onClose }) {
  const kind = previewKindOf(doc);
  const pagesRef = useRef(null);
  const { showToast } = useToast();

  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const [zoom, setZoom] = useState("fit");
  const [scale, setScale] = useState(1);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    $documents.download(doc.id)
      .then((result) => {
        if (cancelled) return;
        // An <img> needs a URL; pdf.js reads the blob itself.
        setFile({ ...result, url: kind === "image" ? URL.createObjectURL(result.blob) : null });
      })
      .catch((err) => {
        if (cancelled || err?.response?.status === 401) return;
        setError(describeError(err));
        setStatus("error");
      });

    return () => { cancelled = true; };
  }, [doc.id, kind]);

  useEffect(() => () => {
    if (file?.url) URL.revokeObjectURL(file.url);
  }, [file]);

  const handleRenderError = useCallback((err) => {
    setError(describeError(err));
    setStatus("error");
  }, []);

  const handleLoad = useCallback((count) => {
    setPageCount(count);
    setStatus("ready");
  }, []);

  const goToPage = useCallback((number) => {
    if (!pageCount) return;
    const target = Math.min(Math.max(number, 1), pageCount);
    setPage(target);
    pagesRef.current?.scrollToPage(target);
  }, [pageCount]);

  const filename = file?.filename || doc.original_name || doc.title || "document";

  const handleDownload = async () => {
    if (file?.blob) {
      $documents.saveBlob(file.blob, filename);
      return;
    }

    // The preview never arrived, so this is a fresh fetch.
    try {
      await $documents.saveToDisk(doc.id, filename);
    } catch (err) {
      if (err?.response?.status === 401) return;
      showToast({ variant: "error", title: "Download failed", description: $auth.getErrorMessage(err) });
    }
  };

  const ready = status === "ready";
  const isPdf = kind === "pdf";

  useEffect(() => {
    if (!ready) return undefined;

    const handleKey = (event) => {
      if (event.target instanceof HTMLInputElement || event.metaKey || event.ctrlKey || event.altKey) return;

      const actions = {
        "+": () => setZoom(nextZoom(scale)),
        "=": () => setZoom(nextZoom(scale)),
        "-": () => setZoom(previousZoom(scale)),
        "0": () => setZoom("fit"),
        ...(isPdf ? {
          ArrowLeft: () => goToPage(page - 1),
          ArrowRight: () => goToPage(page + 1),
          PageUp: () => goToPage(page - 1),
          PageDown: () => goToPage(page + 1),
        } : {}),
      };

      const action = actions[event.key];
      if (!action) return;

      event.preventDefault();
      action();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [ready, isPdf, scale, page, goToPage]);

  const meta = [
    kindLabel,
    `v${doc.version ?? 1}`,
    doc.sizeLabel,
    doc.original_name,
  ].filter(Boolean).join(" · ");

  const showsContent = file?.blob && status !== "error";

  return (
    <Dialog
      open
      onOpenChange={(open) => { if (!open) onClose(); }}
      size="xl"
      title={doc.title || doc.original_name || "Document"}
      description={meta}
      closeLabel="Close viewer"
      className="ogcr-doc-viewer"
    >
      <div className="ogcr-doc-viewer__toolbar" role="toolbar" aria-label="Viewer controls">
        {isPdf && (
          <div className="ogcr-doc-viewer__group">
            <ToolButton label="Previous page" disabled={!ready || page <= 1} onClick={() => goToPage(page - 1)}>
              <CaretLeftIcon size={18} weight="bold" />
            </ToolButton>
            <PageJump page={page} pageCount={pageCount} disabled={!ready} onJump={goToPage} />
            <ToolButton label="Next page" disabled={!ready || page >= pageCount} onClick={() => goToPage(page + 1)}>
              <CaretRightIcon size={18} weight="bold" />
            </ToolButton>
          </div>
        )}

        <div className="ogcr-doc-viewer__group">
          <ToolButton label="Zoom out" disabled={!ready || scale <= ZOOM_STEPS[0]} onClick={() => setZoom(previousZoom(scale))}>
            <MagnifyingGlassMinusIcon size={18} />
          </ToolButton>
          <span className="ogcr-doc-viewer__zoom" aria-live="polite">
            {ready ? `${Math.round(scale * 100)}%` : "–"}
          </span>
          <ToolButton label="Zoom in" disabled={!ready || scale >= ZOOM_STEPS.at(-1)} onClick={() => setZoom(nextZoom(scale))}>
            <MagnifyingGlassPlusIcon size={18} />
          </ToolButton>
          <ToolButton
            label={isPdf ? "Fit to width" : "Fit to screen"}
            className="ogcr-doc-viewer__tool--fit"
            pressed={zoom === "fit"}
            disabled={!ready}
            onClick={() => setZoom("fit")}
          >
            {isPdf ? <ArrowsOutLineHorizontalIcon size={18} /> : <CornersInIcon size={18} />}
          </ToolButton>
        </div>

        <Button
          variant="outlined"
          className="ogcr-doc-viewer__download"
          size="m"
          aria-label="Download"
          iconLeft={<DownloadSimpleIcon size={16} />}
          disabled={status === "loading" && !file}
          onClick={handleDownload}
        >
          Download
        </Button>
      </div>

      <div className="ogcr-doc-viewer__stage">
        {showsContent && isPdf && (
          <PdfPages
            ref={pagesRef}
            blob={file.blob}
            zoom={zoom}
            onScaleChange={setScale}
            onLoad={handleLoad}
            onPageChange={setPage}
            onError={handleRenderError}
          />
        )}

        {showsContent && kind === "image" && (
          <ImageView
            src={file.url}
            alt={doc.title || doc.original_name || "Document image"}
            zoom={zoom}
            onScaleChange={setScale}
            onLoad={() => setStatus("ready")}
            onError={handleRenderError}
          />
        )}

        {!file && status === "loading" && (
          <div className="ogcr-doc-viewer__state">
            <Loader size="l" label="Loading document" />
            <p className="ogcr-doc-viewer__state-text">Loading document…</p>
          </div>
        )}

        {status === "error" && (
          <div className="ogcr-doc-viewer__state">
            <Message state="error" title="Could not show this document" description={error} />
          </div>
        )}
      </div>
    </Dialog>
  );
}

export default DocumentViewerModal;
