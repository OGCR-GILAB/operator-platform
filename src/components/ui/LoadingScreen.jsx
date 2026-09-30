import { Logo } from "./Logo";
import Loader from "./Loader";

function LoadingScreen(props) {
  const {
    title = "Operator Platform",
    statusText = "Preparing operator workspace…",
    className = "",
  } = props;

  const [titleStart = "", ...titleRest] = title.split(" ");
  const titleAccent = titleRest.join(" ");

  return (
    <div className={`app-loading-screen ${className}`.trim()} aria-live="polite" aria-busy="true">
      <div className="app-loading-screen__card">
        <Logo width={220} className="app-loading-screen__logo" aria-hidden="true" />

        <h1 className="app-loading-screen__title">
          {titleStart}
          {titleAccent ? <span className="app-loading-screen__title-accent"> {titleAccent}</span> : null}
        </h1>

        <div className="app-loading-screen__status" role="status" aria-label="Loading application">
          <Loader variant="ring" size="xl" tone="primary" />
          <span className="app-loading-screen__status-text">{statusText}</span>
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
