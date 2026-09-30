import { LogoMark } from "./Logo";

function Footer(props) {
  const {
    variant = "full",
    brandName = "OGCR Operator Platform",
    description = "Design-system aligned interface for monitoring, verification, and issuance workflows.",
    sections = [
      {
        title: "Platform",
        links: [
          { label: "Overview", href: "#" },
          { label: "Activities", href: "#" },
          { label: "Registry", href: "#" },
        ],
      },
      {
        title: "Resources",
        links: [
          { label: "Documentation", href: "#" },
          { label: "API", href: "#" },
          { label: "Design tokens", href: "#" },
        ],
      },
      {
        title: "Company",
        links: [
          { label: "About", href: "#" },
          { label: "Security", href: "#" },
          { label: "Contact", href: "#" },
        ],
      },
    ],
    metaLinks = [
      { label: "Privacy", href: "#" },
      { label: "Terms", href: "#" },
      { label: "Status", href: "#" },
    ],
    copyright = `© ${new Date().getFullYear()} OGCR. All rights reserved.`,
    className = "",
    style = {},
  } = props;

  if (variant === "compact") {
    return (
      <footer
        className={`ogcr-footer ogcr-footer--compact ${className}`.trim()}
        style={style}
        aria-label="Site footer"
      >
        <div className="ogcr-footer__compact-inner">
          <div className="ogcr-footer__brand-compact">
            <span className="ogcr-footer__logo" aria-hidden="true">
              <LogoMark width={24} />
            </span>
            <div className="ogcr-footer__brand-compact-text">
              <strong className="ogcr-footer__brand-name">{brandName}</strong>
              <p className="ogcr-footer__copyright">{copyright}</p>
            </div>
          </div>

          <div className="ogcr-footer__eu-funding" aria-label="European Union funding information">
            <img
              className="ogcr-footer__eu-flag"
              src="/eu.svg"
              alt="European Union flag"
              loading="lazy"
              decoding="async"
            />
            <div className="ogcr-footer__eu-copy">
              <p className="ogcr-footer__eu-text">
                The OGCR Project has received funding from the European Union&apos;s Horizon Europe
                programme under grant agreement{" "}
                <a
                  className="ogcr-footer__eu-link"
                  href="https://cordis.europa.eu/project/id/101218854"
                  target="_blank"
                  rel="noreferrer"
                >
                  101218854
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={`ogcr-footer ogcr-footer--full ${className}`.trim()} style={style} aria-label="Site footer">
      <div className="ogcr-footer__top">
        <div className="ogcr-footer__brand">
          <span className="ogcr-footer__logo" aria-hidden="true">
            <LogoMark width={32} />
          </span>
          <div className="ogcr-footer__brand-text">
            <strong className="ogcr-footer__brand-name">{brandName}</strong>
            <p className="ogcr-footer__description">{description}</p>

            <div className="ogcr-footer__eu-funding" aria-label="European Union funding information">
              <img
                className="ogcr-footer__eu-flag"
                src="/eu.svg"
                alt="European Union flag"
                loading="lazy"
                decoding="async"
              />
              <div className="ogcr-footer__eu-copy">
                <p className="ogcr-footer__eu-text">
                  The OGCR Project has received funding from the European Union&apos;s Horizon
                  Europe programme under grant agreement {" "}
                  <a
                    className="ogcr-footer__eu-link"
                    href="https://cordis.europa.eu/project/id/101218854"
                    target="_blank"
                    rel="noreferrer"
                  >
                    101218854
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav className="ogcr-footer__sections" aria-label="Footer links">
          {sections.map((section) => (
            <div key={section.title} className="ogcr-footer__section">
              <h4 className="ogcr-footer__section-title">{section.title}</h4>
              <ul className="ogcr-footer__links" role="list">
                {(section.links || []).map((link) => (
                  <li key={`${section.title}-${link.label}`}>
                    <a className="ogcr-footer__link" href={link.href || "#"}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="ogcr-footer__bottom">
        <p className="ogcr-footer__copyright">{copyright}</p>
        <nav className="ogcr-footer__meta" aria-label="Legal links">
          {metaLinks.map((link) => (
            <a key={link.label} className="ogcr-footer__meta-link" href={link.href || "#"}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
