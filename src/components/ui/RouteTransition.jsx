import { useLayoutEffect, useRef } from "react";

/**
 * Gives a navigation a beginning.
 *
 * There is no exit animation on purpose. Holding the outgoing screen on screen
 * while it fades costs every navigation that much delay before the new one can
 * even start loading, and the two screens have to overlap to avoid a flash —
 * which is its own layout problem. Entering only is both faster and calmer.
 *
 * `transitionKey` is what counts as a new destination. It is deliberately not
 * the whole pathname: the activity tabs animate inside the workspace, so from
 * out here one activity is a single place.
 */
function RouteTransition(props) {
  const {
    transitionKey,
    variant = "page",
    scrollReset = true,
    className = "",
    children,
  } = props;

  const isFirstRender = useRef(true);

  // The keyed div below remounts on every change, so the "is this the first
  // one" flag has to live out here, above the key.
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!scrollReset) return;

    // Instant, not smooth: a half-second glide up while the new screen fades in
    // reads as the page moving on its own.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [transitionKey, scrollReset]);

  return (
    <div
      key={transitionKey}
      className={`ogcr-route-transition ogcr-route-transition--${variant} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

export default RouteTransition;
