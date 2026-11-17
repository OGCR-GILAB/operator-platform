import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * A single image, scrolled when it is larger than the viewport. `zoom` is a
 * number (1 = natural size) or "fit", which shows the whole image but never
 * blows a small one up past its own pixels. `src` is an object URL the caller
 * owns and revokes.
 */
function ImageView({ src, alt, zoom, onScaleChange, onLoad, onError }) {
  const [scroller, setScroller] = useState(null);
  const [natural, setNatural] = useState(null);
  const [available, setAvailable] = useState(null);

  const callbacks = useRef({ onScaleChange, onLoad, onError });
  useLayoutEffect(() => {
    callbacks.current = { onScaleChange, onLoad, onError };
  });

  useEffect(() => {
    if (!scroller) return undefined;

    const measure = () => {
      const style = window.getComputedStyle(scroller);
      setAvailable({
        width: scroller.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        height: scroller.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom),
      });
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(scroller);

    return () => observer.disconnect();
  }, [scroller]);

  const fitScale = natural && available
    ? Math.min(1, available.width / natural.width, available.height / natural.height)
    : 1;
  const scale = zoom === "fit" ? fitScale : zoom;

  useEffect(() => {
    callbacks.current.onScaleChange?.(scale);
  }, [scale]);

  return (
    <div ref={setScroller} className="ogcr-doc-viewer__viewport ogcr-doc-viewer__viewport--image" tabIndex={0}>
      {src && (
        <img
          className="ogcr-doc-viewer__image"
          src={src}
          alt={alt}
          style={natural ? { width: natural.width * scale, height: natural.height * scale } : { visibility: "hidden" }}
          onLoad={(event) => {
            setNatural({
              width: event.currentTarget.naturalWidth,
              height: event.currentTarget.naturalHeight,
            });
            callbacks.current.onLoad?.();
          }}
          onError={() => callbacks.current.onError?.(new Error("The image could not be decoded."))}
        />
      )}
    </div>
  );
}

export default ImageView;
