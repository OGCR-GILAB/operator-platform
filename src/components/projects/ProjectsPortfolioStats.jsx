import StatStrip from "../ui/StatStrip";
import { localCompleteness } from "./projectPresentation";

/**
 * Built entirely from fields `GET projects/` already returns, so the portfolio
 * header costs no extra requests. `totalParcels` stands in for area: hectares
 * live on the parcels, not on the project.
 *
 * One slim band rather than four cards — on this page the activity list is the
 * subject, and these numbers only frame it.
 */
function ActivitiesPortfolioStats(props) {
  const { activities = [], totalAreaHa = null } = props;

  const submitted = activities.filter((activity) => activity.submitted_at
    || ["submitted", "accepted", "rejected"].includes(activity.status)).length;
  const accepted = activities.filter((activity) => activity.status === "accepted").length;
  const rejected = activities.filter((activity) => activity.status === "rejected").length;
  const totalParcels = activities.reduce(
    (sum, activity) => sum + (Number(activity.parcel_count) || 0),
    0,
  );

  const averageReadiness = activities.length > 0
    ? Math.round(
      activities.reduce((sum, activity) => sum + localCompleteness(activity), 0) / activities.length,
    )
    : 0;

  const hasArea = Number.isFinite(Number(totalAreaHa));

  const items = [
    {
      id: "total",
      label: "Activities",
      value: activities.length,
      sublabel: `${submitted} submitted`,
      tone: "brand",
    },
    {
      id: "area",
      label: hasArea ? "Total area" : "Linked parcels",
      value: hasArea
        ? Number(totalAreaHa).toLocaleString(undefined, { maximumFractionDigits: 0 })
        : totalParcels,
      unit: hasArea ? "ha" : undefined,
      sublabel: hasArea
        ? `across ${totalParcels} parcel${totalParcels === 1 ? "" : "s"}`
        : "linked to activities",
      tone: "neutral",
    },
    {
      id: "readiness",
      label: "Avg completeness",
      value: averageReadiness,
      unit: "%",
      sublabel: "before submission checks",
      tone: averageReadiness >= 80 ? "positive" : (averageReadiness >= 40 ? "brand" : "warning"),
    },
    {
      id: "outcome",
      label: "Certified",
      value: `${accepted}/${activities.length}`,
      sublabel: rejected ? `${rejected} rejected` : "accepted by the certifier",
      tone: rejected ? "negative" : (accepted ? "positive" : "neutral"),
    },
  ];

  return <StatStrip items={items} ariaLabel="Portfolio metrics" />;
}

export default ActivitiesPortfolioStats;
