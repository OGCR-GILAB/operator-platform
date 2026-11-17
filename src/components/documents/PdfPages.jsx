import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import Loader from "../ui/Loader";

// pdf.js speaks in points (1/72 in); the page is laid out in CSS pixels (1/96 in),
// so 100 % here means "printed size", as in every other PDF viewer.
const CSS_UNITS = 96 / 72;
// A canvas this large is already sharp; past it, memory runs out on phones.
const MAX_CANVAS_PIXELS = 16_777_216;

let pdfjsPromise = null;

/** pdf.js is a megabyte — fetched the first time someone opens a PDF, never before. */
function loadPdfjs() {
  pdfjsPromise ??= Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]).then(([pdfjs, worker]) => {
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    return pdfjs;
  });

  return pdfjsPromise;
}

function horizontalPadding(element) {
  const style = window.getComputedStyle(element);
  return parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
}

/**
 * One page. It keeps its exact size from the start so the scrollbar is right
 * before anything is drawn, and only renders once it is near the viewport.
 * A new zoom renders into a fresh canvas that replaces the old one when done,
 * so the page never flashes blank — the stale canvas just stretches meanwhile.
 */
function PdfPage({ pdf, number, size, scale, root, pageRef }) {
  const boxRef = useRef(null);
  const [nearby, setNearby] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || !root) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setNearby(entry.isIntersecting),
      { root, rootMargin: "100% 0px" },
    );
    observer.observe(box);

    return () => observer.disconnect();
  }, [root]);

  useEffect(() => {
    if (!nearby) return undefined;

    let task = null;
    let cancelled = false;

    pdf.getPage(number).then((page) => {
      if (cancelled) return;

      const viewport = page.getViewport({ scale: scale * CSS_UNITS });
      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height)),
      );

      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);

      task = page.render({
        canvas,
        viewport,
        transform: pixelRatio !== 1 ? [pixelRatio, 0, 0, pixelRatio, 0, 0] : undefined,
      });

      return task.promise.then(() => {
        if (!cancelled) boxRef.current?.replaceChildren(canvas);
      });
    }).catch((err) => {
      // A zoom or a scroll-away cancels the task in flight; that is expected.
      if (err?.name !== "RenderingCancelledException") console.error(err);
    });

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, number, scale, nearby]);

  return (
    <div
      ref={(element) => {
        boxRef.current = element;
        pageRef(element);
      }}
      className="ogcr-doc-viewer__page"
      style={{ width: size.width * scale * CSS_UNITS, height: size.height * scale * CSS_UNITS }}
      aria-label={`Page ${number}`}
      role="img"
    />
  );
}

/**
 * Every page of a PDF, stacked in one scrolling column. `zoom` is either a
 * number (1 = 100 %) or "fit", which follows the width of the viewport.
 */
function PdfPages({ blob, zoom, onScaleChange, onLoad, onPageChange, onError, ref }) {
  const [scroller, setScroller] = useState(null);
  const [pdf, setPdf] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [availableWidth, setAvailableWidth] = useState(0);

  const pageElements = useRef([]);
  const scrollRatio = useRef(0);
  const currentPage = useRef(1);

  // The callbacks come from the parent's render; reading them through a ref
  // keeps the loading effect from re-running whenever the parent re-renders.
  const callbacks = useRef({ onScaleChange, onLoad, onPageChange, onError });
  useLayoutEffect(() => {
    callbacks.current = { onScaleChange, onLoad, onPageChange, onError };
  });

  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;

    (async () => {
      const pdfjs = await loadPdfjs();
      // pdf.js takes ownership of the buffer it is given, so read a fresh one
      // on every run rather than sharing one across effect re-runs.
      const data = await blob.arrayBuffer();
      if (cancelled) return;

      loadingTask = pdfjs.getDocument({ data });
      const documentProxy = await loadingTask.promise;

      const pages = await Promise.all(
        Array.from({ length: documentProxy.numPages }, (_, index) =>
          documentProxy.getPage(index + 1).then((page) => {
            const { width, height } = page.getViewport({ scale: 1 });
            return { width, height };
          })),
      );

      if (cancelled) return;

      setPdf(documentProxy);
      setSizes(pages);
      callbacks.current.onLoad?.(pages.length);
    })().catch((err) => {
      if (!cancelled) callbacks.current.onError?.(err);
    });

    return () => {
      cancelled = true;
      // pdf.js 6 tears the document down through its loading task only.
      loadingTask?.destroy();
    };
  }, [blob]);

  useEffect(() => {
    if (!scroller) return undefined;

    const measure = () => setAvailableWidth(scroller.clientWidth - horizontalPadding(scroller));
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(scroller);

    return () => observer.disconnect();
  }, [scroller]);

  const widest = sizes.reduce((max, size) => Math.max(max, size.width), 0);
  const fitScale = widest && availableWidth > 0 ? availableWidth / (widest * CSS_UNITS) : 1;
  const scale = zoom === "fit" ? fitScale : zoom;

  useEffect(() => {
    callbacks.current.onScaleChange?.(scale);
  }, [scale]);

  // Zooming keeps the reader where they were, rather than where the top-left
  // corner happens to land at the new size.
  useLayoutEffect(() => {
    if (!scroller) return;
    scroller.scrollTo({ top: scrollRatio.current * scroller.scrollHeight });
  }, [scroller, scale]);

  const handleScroll = useCallback(() => {
    if (!scroller) return;

    scrollRatio.current = scroller.scrollHeight ? scroller.scrollTop / scroller.scrollHeight : 0;

    // The current page is the one under the upper third of the viewport.
    const probe = scroller.scrollTop + scroller.clientHeight / 3;
    let page = 1;

    pageElements.current.forEach((element, index) => {
      if (element && element.offsetTop <= probe) page = index + 1;
    });

    if (page !== currentPage.current) {
      currentPage.current = page;
      callbacks.current.onPageChange?.(page);
    }
  }, [scroller]);

  useImperativeHandle(ref, () => ({
    scrollToPage(number) {
      const element = pageElements.current[number - 1];
      if (!scroller || !element) return;

      scroller.scrollTo({ top: element.offsetTop - parseFloat(window.getComputedStyle(scroller).paddingTop) });
    },
  }), [scroller]);

  return (
    <div ref={setScroller} className="ogcr-doc-viewer__viewport" onScroll={handleScroll} tabIndex={0}>
      {pdf ? (
        <div className="ogcr-doc-viewer__pages">
          {sizes.map((size, index) => (
            <PdfPage
              key={index}
              pdf={pdf}
              number={index + 1}
              size={size}
              scale={scale}
              root={scroller}
              pageRef={(element) => { pageElements.current[index] = element; }}
            />
          ))}
        </div>
      ) : (
        <div className="ogcr-doc-viewer__state">
          <Loader size="l" label="Preparing pages" />
        </div>
      )}
    </div>
  );
}

export default PdfPages;
