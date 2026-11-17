import {
  ArrowLeftIcon,
  ClipboardTextIcon,
  FileTextIcon,
  FolderIcon,
  HouseIcon,
  MapPinIcon,
  MapTrifoldIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react";
import { useMemo, useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router-dom";
import { SideNavigation } from "@majistudio/ogcr-design-system";
import { useGlobal } from "../providers/GlobalContext";
import { useActivity } from "../activity/ActivityContext";

// Below the DS tablet breakpoint the sidebar folds into its mobile drawer.
const MOBILE_QUERY = "(max-width: 640px)";
const subscribeMobile = (onChange) => {
  const media = window.matchMedia(MOBILE_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const isMobileNow = () => window.matchMedia(MOBILE_QUERY).matches;

/**
 * The sidebar has two shapes. Outside an activity it offers the two global
 * places; inside one it becomes that activity's own menu, so the operator can
 * always tell which activity they are working on and how to get back out.
 */
function Header() {
  const { pathname } = useLocation();
  const mobile = useSyncExternalStore(subscribeMobile, isMobileNow);
  const { loggedIn } = useGlobal();
  const { activityId, activity, documentTotal } = useActivity();

  const inActivity = Boolean(activityId);

  const navigationItems = useMemo(() => {
    if (!loggedIn) {
      return [{ id: "home", path: "/", label: "Home", icon: <HouseIcon /> }];
    }

    if (inActivity) {
      const base = `/activities/${activityId}`;

      return [
        { id: "back", path: "/activities", label: "All activities", icon: <ArrowLeftIcon /> },
        { id: "activity-overview", path: `${base}/overview`, label: "Overview", icon: <SquaresFourIcon /> },
        { id: "activity-plans", path: `${base}/plans`, label: "Plans", icon: <ClipboardTextIcon /> },
        {
          id: "activity-parcels",
          path: `${base}/parcels`,
          label: "Parcels",
          icon: <MapPinIcon />,
          badge: activity?.parcel_count || undefined,
        },
        {
          id: "activity-documents",
          path: `${base}/documents`,
          label: "Documents",
          icon: <FileTextIcon />,
          badge: documentTotal || undefined,
        },
        { id: "activity-map", path: `${base}/map`, label: "Map", icon: <MapTrifoldIcon /> },
      ];
    }

    return [
      { id: "overview", path: "/overview", label: "Overview", icon: <SquaresFourIcon /> },
      { id: "activities", path: "/activities", label: "Activities", icon: <FolderIcon /> },
    ];
  }, [loggedIn, inActivity, activityId, activity?.parcel_count, documentTotal]);

  // The URL is the single source of truth — the longest matching path wins, so
  // `/activities/7/parcels` highlights Parcels rather than All activities.
  const activeItem = useMemo(() => {
    const matches = navigationItems
      .filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
      .sort((a, b) => b.path.length - a.path.length);

    return matches[0]?.id;
  }, [navigationItems, pathname]);

  const brandName = useMemo(() => {
    if (pathname === "/") return null;
    if (inActivity) return activity?.name || "Activity";

    if (pathname.startsWith("/activities")) return "Activities";
    if (pathname.startsWith("/overview")) return "Overview";
    if (pathname.startsWith("/profile")) return "Profile";

    return null;
  }, [pathname, inActivity, activity?.name]);

  return (
    <SideNavigation
      aria-label="Side navigation"
      product={brandName ?? undefined}
      layout={mobile ? "mobile" : "desktop"}
      activeId={activeItem ?? ""}
      // Router links, so items are real anchors and navigate without a reload.
      items={navigationItems.map(({ id, path, label, icon, badge }) => ({
        id,
        label,
        icon,
        badge,
        render: <Link to={path} />,
      }))}
    />
  );
}

export default Header;
