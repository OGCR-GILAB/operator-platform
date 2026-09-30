import { useState } from "react";
import { CaretDown, CaretLeft, CaretLeftIcon, CaretRight, CaretRightIcon } from "@phosphor-icons/react";
import { Logo, LogoMark } from "./Logo";

function Navigation(props) {
  const {
    placement = "top",
    logo,
    brandName = null,
    brandHref,
    items = [],
    activeItem,
    onItemSelect,
    trailing,
    isMenuOpen,
    onMenuToggle,
    isCollapsed,
    onCollapsedToggle,
    className = "",
    ariaLabel = "Application navigation",
  } = props;

  const [localMenuOpen, setLocalMenuOpen] = useState(false);
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const menuOpen = isMenuOpen !== undefined ? isMenuOpen : localMenuOpen;
  const collapsed = isCollapsed !== undefined ? isCollapsed : localCollapsed;

  const toggleMenu = () => {
    if (onMenuToggle) {
      onMenuToggle(!menuOpen);
    } else {
      setLocalMenuOpen(!localMenuOpen);
    }
  };

  const toggleCollapse = () => {
    if (onCollapsedToggle) {
      onCollapsedToggle(!collapsed);
    } else {
      setLocalCollapsed(!collapsed);
    }
  };

  const handleItemClick = (item, event) => {
    if (item.disabled) {
      event.preventDefault();
      return;
    }

    if (onItemSelect) {
      onItemSelect(item, event);
    }

    if (item.onClick) {
      item.onClick(event);
    }
  };

  return (
    <nav
      className={`ogcr-navigation ogcr-navigation--${placement} ${collapsed ? "ogcr-navigation--collapsed" : ""} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <div className="ogcr-navigation__left">
        <div className="ogcr-navigation__brand">
          <div className="ogcr-navigation__logo" aria-hidden="true">
            {logo ?? <LogoMark width={36} />}
          </div>
          {brandName && (
            <>
              <span className="ogcr-navigation__divider" aria-hidden="true" />
              {brandHref ? (
                <a className="ogcr-navigation__brand-name" href={brandHref}>
                  {brandName}
                </a>
              ) : (
                <span className="ogcr-navigation__brand-name">{brandName}</span>
              )}
            </>
          )}

          {placement === "side" && !collapsed && (
            <button
              type="button"
              className="ogcr-navigation__collapse-toggle ogcr-navigation__collapse-toggle--inline"
              onClick={toggleCollapse}
              aria-label="Collapse sidebar"
              aria-expanded
            >
              <CaretLeftIcon size={16} weight="bold" />
            </button>
          )}
        </div>

        {placement === "side" && collapsed && (
          <button
            type="button"
            className="ogcr-navigation__collapse-toggle ogcr-navigation__collapse-toggle--list"
            onClick={toggleCollapse}
            aria-label="Expand sidebar"
            aria-expanded={false}
          >
            <CaretRightIcon size={16} weight="bold" />
          </button>
        )}

        <ul style={{position: 'sticky', top: '10px'}} className={`ogcr-navigation__items ${menuOpen ? "ogcr-navigation__items--open" : ""}`} role="list">
          {items.map((item) => {
            const key = item.id ?? item.label;
            const isActive = item.active ?? (activeItem !== undefined && activeItem === item.id);

            const itemClassName = [
              "ogcr-navigation__item",
              isActive ? "ogcr-navigation__item--active" : "",
              item.disabled ? "ogcr-navigation__item--disabled" : "",
            ]
              .join(" ")
              .trim();

            const iconClassName =
              placement === "bottom"
                ? "ogcr-navigation__item-icon ogcr-navigation__item-icon--pill"
                : "ogcr-navigation__item-icon";

            if (item.href) {
              return (
                <li key={key} className="ogcr-navigation__item-wrap">
                  <a
                    href={item.href}
                    className={itemClassName}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(event) => handleItemClick(item, event)}
                    title={collapsed && placement === "side" ? item.label : undefined}
                  >
                    {item.icon ? <span className={iconClassName}>{item.icon}</span> : null}
                    <span className="ogcr-navigation__item-label">{item.label}</span>
                    {item.badge ? <span className="ogcr-navigation__item-badge">{item.badge}</span> : null}
                  </a>
                </li>
              );
            }

            return (
              <li key={key} className="ogcr-navigation__item-wrap">
                <button
                  type="button"
                  className={itemClassName}
                  onClick={(event) => handleItemClick(item, event)}
                  disabled={item.disabled}
                  aria-current={isActive ? "page" : undefined}
                  title={collapsed && placement === "side" ? item.label : undefined}
                >
                  {item.icon ? <span className={iconClassName}>{item.icon}</span> : null}
                  <span className="ogcr-navigation__item-label">{item.label}</span>
                  {item.badge ? <span className="ogcr-navigation__item-badge">{item.badge}</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {placement === "top" && (
        <button
          type="button"
          className="ogcr-navigation__menu-toggle"
          onClick={toggleMenu}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
        >
          <CaretDown size={24} weight="bold" />
        </button>
      )}

      {trailing ? <div className="ogcr-navigation__trailing">{trailing}</div> : null}
    </nav>
  );
}

export default Navigation;
