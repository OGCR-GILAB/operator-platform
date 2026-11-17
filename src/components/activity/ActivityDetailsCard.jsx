import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRightIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { Button, Card, Message, Pill, Select } from "@majistudio/ogcr-design-system";
import DetailList, { DetailGroup } from "../ui/DetailList";
import useCertificationSchemes, { schemeHelperText } from "../projects/useCertificationSchemes";
import {
  ACTIVITY_TYPE_LABELS,
  formatDate,
  syncLabel,
  syncTone,
} from "../projects/projectPresentation";

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * The activity's own facts, grouped by the question each set answers. Status
 * and the activity's sync badge are left out: the workspace header above
 * carries them on every tab.
 *
 * `onSaveScheme(option)` resolves to true once saved.
 */
function ActivityDetailsCard({
  activity,
  operator,
  isSubmitted,
  documentTotal,
  onEditDetails,
  onSaveScheme,
  savingScheme = false,
}) {
  // The server's flag decides: a submitted activity is editable again while
  // the certifier has changes requested.
  const editable = activity.is_editable !== false;

  // The create form is otherwise the only place a scheme can be chosen, so an
  // activity started without one could never gain one. The list is only fetched
  // once the user opens the editor.
  const [editingScheme, setEditingScheme] = useState(false);
  const [schemeChoice, setSchemeChoice] = useState("");
  const schemes = useCertificationSchemes({ enabled: editingScheme });
  const schemeOptions = schemes.options;

  const openSchemeEditor = () => {
    setSchemeChoice(activity.certification_scheme_id || "");
    setEditingScheme(true);
  };

  const saveScheme = () => {
    const chosen = schemeOptions.find((option) => option.value === schemeChoice);
    if (!chosen) return;
    onSaveScheme(chosen).then((ok) => { if (ok) setEditingScheme(false); });
  };

  const schemeMissing = !isSubmitted && !activity.certification_scheme_id && !editingScheme;
  const base = `/activities/${activity.id}`;

  return (
    <Card
      title="Details"
      trailing={editable ? (
        <Button
          variant="outlined"
          size="s"
          iconLeft={<PencilSimpleIcon size={16} />}
          onClick={onEditDetails}
        >
          Edit
        </Button>
      ) : null}
    >
      <DetailGroup title="General">
        <DetailList>
          <DetailList.Item label="Type">
            {ACTIVITY_TYPE_LABELS[activity.type] || activity.type || activity.unit_types}
          </DetailList.Item>
          <DetailList.Item label="Runs">
            {formatDate(activity.start_date)} → {formatDate(activity.end_date)}
          </DetailList.Item>
          <DetailList.Item label="Operator">{activity.operator_name}</DetailList.Item>
          <DetailList.Item label="Owner">{activity.owner_username}</DetailList.Item>
        </DetailList>
      </DetailGroup>

      <DetailGroup
        title="Registry"
        hint="The identifier is assigned before submission; the badge in the header says whether the activity exists on DCR."
      >
        <DetailList>
          <DetailList.Item label="DCR identifier">
            {activity.dcr_id ? <span className="ogcr-detail-list__mono">{activity.dcr_id}</span> : null}
          </DetailList.Item>
          {operator && (
            <DetailList.Item label="Operator on DCR">
              <Pill tone={syncTone(operator)}>{syncLabel(operator)}</Pill>
            </DetailList.Item>
          )}

          {editingScheme ? (
            <DetailList.Item label="Certification scheme" span="full">
              <div className="ogcr-detail-list__editor">
                <Select
                  label="Certification scheme"
                  value={schemeChoice || null}
                  options={schemeOptions.map(({ value, label, source }) => ({
                    value,
                    label: source === "sample"
                      ? <span className="flex flex-row items-center gap-4">{label}<Pill tone="warning">Sample</Pill></span>
                      : label,
                  }))}
                  placeholder="Select a scheme"
                  onValueChange={(value) => setSchemeChoice(value)}
                  helperText={schemeHelperText(schemes)}
                />
                <div className="flex flex-row items-center gap-8">
                  <Button
                    variant="filled"
                    size="s"
                    disabled={!schemeChoice || savingScheme}
                    onClick={saveScheme}
                  >
                    {savingScheme ? "Saving…" : "Save scheme"}
                  </Button>
                  <Button
                    variant="text"
                    size="s"
                    disabled={savingScheme}
                    onClick={() => setEditingScheme(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DetailList.Item>
          ) : (
            <DetailList.Item label="Certification scheme" span="full">
              <span className="ogcr-detail-list__inline">
                {activity.certification_scheme_name || "Not set"}
                {editable && (
                  <Button variant="text" size="s" onClick={openSchemeEditor}>
                    {activity.certification_scheme_id ? "Change" : "Set scheme"}
                  </Button>
                )}
              </span>
            </DetailList.Item>
          )}
        </DetailList>

        {schemeMissing && (
          <Message
            state="warning"
            title={activity.certification_scheme_name ? "Scheme has no identifier" : "No certification scheme"}
            description={activity.certification_scheme_name
              ? "DCR matches on the identifier, so the activity would be registered without a scheme."
              : "The activity would be registered on DCR without one."}
          />
        )}
      </DetailGroup>

      {/* Before submission the setup guide covers all of this, with a way into each. */}
      {isSubmitted && (
        <DetailGroup
          title="Records"
          action={(
            <Link className="ogcr-detail-list__link" to={`${base}/plans`}>
              {activity.is_editable === false ? "View plans" : "Edit plans"}
              <ArrowRightIcon size={14} />
            </Link>
          )}
        >
          <DetailList columns={3}>
            <DetailList.Item label="Activity plan">
              <Pill tone={activity.has_plan ? "positive" : "neutral"}>
                {activity.has_plan ? "Created" : "Not started"}
              </Pill>
            </DetailList.Item>
            <DetailList.Item label="Monitoring plan">
              <Pill tone={activity.has_monitoring_plan ? "positive" : "neutral"}>
                {activity.has_monitoring_plan ? "Created" : "Not started"}
              </Pill>
            </DetailList.Item>
            <DetailList.Item label="Submitted">{formatDate(activity.submitted_at)}</DetailList.Item>
            <DetailList.Item label="Parcels">
              <Link className="ogcr-detail-list__link" to={`${base}/parcels`}>
                {plural(activity.parcel_count ?? 0, "parcel")}
                <ArrowRightIcon size={14} />
              </Link>
            </DetailList.Item>
            <DetailList.Item label="Documents">
              <Link className="ogcr-detail-list__link" to={`${base}/documents`}>
                {plural(documentTotal ?? 0, "document")}
                <ArrowRightIcon size={14} />
              </Link>
            </DetailList.Item>
            <DetailList.Item label="Last updated">{formatDate(activity.updated_at)}</DetailList.Item>
          </DetailList>
        </DetailGroup>
      )}
    </Card>
  );
}

export default ActivityDetailsCard;
