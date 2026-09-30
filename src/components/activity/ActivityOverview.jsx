import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowClockwiseIcon,
  CheckCircleIcon,
  FileTextIcon,
  PaperPlaneTiltIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import Button from "../ui/Button";
import Card from "../ui/Card";
import Message from "../ui/Message";
import Pill from "../ui/Pill";
import ProgressBar from "../ui/ProgressBar";
import ActivityTabHeader from "./ActivityTabHeader";
import { useActivity } from "./ActivityContext";
import { useGlobal } from "../providers/GlobalContext";
import Select from "../ui/Select";
import useCertificationSchemes from "../projects/useCertificationSchemes";
import $projects, { SUBMIT_STEP_LABELS } from "../../services/$projects";
import $auth from "../../services/$auth";
import { toList } from "../../services/$api";
import { missingRolesLabel } from "../../models/dcr";
import {
  ACTIVITY_TYPE_LABELS,
  PROJECT_STATUS_LABELS,
  formatDate,
  formatTonnes,
  localCompleteness,
  projectStatusTone,
  syncLabel,
  syncTone,
  verificationLabel,
  verificationTone,
} from "../projects/projectPresentation";

function DetailRow({ label, children }) {
  return (
    <div>
      <span className="ogcr-project-detail__label">{label}</span>
      <span className="ogcr-project-detail__value">{children}</span>
    </div>
  );
}

/** One line of `GET projects/{id}/readiness/` -> checks[]. */
function ReadinessCheck({ check }) {
  const isError = check.level === "error";
  const Icon = check.ok ? CheckCircleIcon : (isError ? XCircleIcon : WarningCircleIcon);

  return (
    <li>
      <Icon
        size={16}
        weight="fill"
        className="ogcr-project-detail__icon"
        color={check.ok ? undefined : (isError ? "var(--color-text-critical, crimson)" : undefined)}
      />
      {check.message || check.code}
    </li>
  );
}

function ActivityOverview() {
  const navigate = useNavigate();
  const { activityId, activity, readiness, reload } = useActivity();
  const { dcrState, dcrCapabilities, refreshMe } = useGlobal();

  // Held with the activity it describes, so another activity's outcome never shows.
  const [dcrScope, setDcrScope] = useState({ forId: null, record: null });
  const dcrStatus = dcrScope.forId === activityId ? dcrScope.record : null;
  const setDcrStatus = (record) => setDcrScope({ forId: activityId, record });
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState("");

  // The create wizard is otherwise the only place a scheme can be chosen, so an
  // activity started without one could never gain one. The list is only fetched
  // once the user opens the editor.
  const [editingScheme, setEditingScheme] = useState(false);
  const [schemeChoice, setSchemeChoice] = useState("");
  const { options: schemeOptions, allSamples } = useCertificationSchemes({ enabled: editingScheme });

  const submittedStatus = activity?.status;
  const hasBeenSubmitted = Boolean(activity?.submitted_at)
    || ["submitted", "accepted", "rejected"].includes(submittedStatus);

  // The last known outcome is read once on load; asking DCR again is the
  // explicit "Refresh" below. Nothing recorded yet (404 / 409) is not an error.
  useEffect(() => {
    if (!activityId || !hasBeenSubmitted) return undefined;

    let cancelled = false;

    $projects.dcrStatus(activityId)
      .then((record) => { if (!cancelled) setDcrScope({ forId: activityId, record }); })
      .catch(() => { if (!cancelled) setDcrScope({ forId: activityId, record: null }); });

    return () => { cancelled = true; };
  }, [activityId, hasBeenSubmitted, submittedStatus]);

  const runAction = async (name, action, successNotice) => {
    setBusy(name);
    setNotice(null);

    try {
      await action();
      setNotice(successNotice);
      reload();
      return true;
    } catch (err) {
      if (err?.response?.status !== 401) setNotice(describeFailure(err));
      return false;
    } finally {
      setBusy("");
    }
  };

  if (!activity) return null;

  const isDraft = activity.status === "draft";
  const isReady = activity.status === "ready";
  const isSubmitted = Boolean(activity.submitted_at)
    || ["submitted", "accepted", "rejected"].includes(activity.status);

  const outcomeParcels = toList(dcrStatus?.parcels);
  const verifiedParcels = outcomeParcels.filter((parcel) => parcel.status_code === "verified").length;
  const failedParcels = outcomeParcels.filter((parcel) => parcel.status_code === "failed").length;

  const readinessErrors = toList(readiness?.errors);
  const readinessWarnings = toList(readiness?.warnings);
  const checks = toList(readiness?.checks);

  // `allowed` is null until `auth/me/` has answered — only an explicit `false`
  // is worth warning about, so a slow or failed read never raises a false alarm.
  const submitCapability = dcrCapabilities?.submit;
  const submitRefused = !isSubmitted && submitCapability?.allowed === false;
  const statusRefused = dcrCapabilities?.status?.allowed === false;
  const noDcrIdentity = !isSubmitted && dcrState === "local_only";

  // Documents are attached to the DCR verifications as part of submit, so an
  // activity with none will be verified without evidence. Defer to readiness if
  // it already says something about documents, rather than contradicting it.
  const readinessMentionsDocuments = checks.some(
    (check) => String(check.code || "").includes("document"),
  );
  const missingDocuments = !isSubmitted
    && !readinessMentionsDocuments
    && Number(activity.document_count ?? 0) === 0;

  return (
    <div className="ogcr-activity-tab">
      <ActivityTabHeader
        description="Where this activity stands, what is still missing, and the actions that move it towards DCR."
        actions={(
          <Button
            variant="text"
            startIcon={<ArrowClockwiseIcon size={16} />}
            onClick={reload}
          >
            Refresh
          </Button>
        )}
      />

      {Boolean(notice) && (
        <Message
          variant={notice.variant}
          title={notice.title}
          description={notice.description}
          onClose={() => setNotice(null)}
        />
      )}

      <Card
        title="Activity"
        subtitle="The DCR identifier is assigned before submission — only the sync badge says whether this activity exists on the registry."
      >
        <div className="ogcr-project-detail__grid">
          <DetailRow label="Status">
            <Pill tone={projectStatusTone(activity.status)}>
              {PROJECT_STATUS_LABELS[activity.status] || activity.status}
            </Pill>
          </DetailRow>
          <DetailRow label="Type">
            {ACTIVITY_TYPE_LABELS[activity.type] || activity.type || activity.unit_types || "—"}
          </DetailRow>
          <DetailRow label="Operator">{activity.operator_name || "—"}</DetailRow>
          <DetailRow label="Owner">{activity.owner_username || "—"}</DetailRow>
          <DetailRow label="Runs">
            {formatDate(activity.start_date)} → {formatDate(activity.end_date)}
          </DetailRow>
          <DetailRow label="DCR sync">
            <Pill tone={syncTone(activity)}>{syncLabel(activity)}</Pill>
          </DetailRow>
          <DetailRow label="DCR identifier">{activity.dcr_id || "—"}</DetailRow>
          <DetailRow label="Certification scheme">
            {activity.certification_scheme_name || "Not set"}
          </DetailRow>
        </div>

        {!isSubmitted && !activity.certification_scheme_id && !editingScheme && (
          <p className="ogcr-card__subtitle">
            {activity.certification_scheme_name
              ? "This scheme has a name but no identifier. DCR matches on the identifier, so the activity would be registered without a scheme."
              : "No certification scheme is set, so the activity would be registered on DCR without one."}
          </p>
        )}

        {!isSubmitted && activity.is_editable !== false && (
          editingScheme ? (
            <div className="ogcr-project-detail__plan">
              <Select
                label="Certification scheme"
                value={schemeChoice}
                options={schemeOptions.map(({ value, label }) => ({ value, label }))}
                placeholder="Select a scheme"
                onChange={(event) => setSchemeChoice(event.target.value)}
                helperText={allSamples
                  ? "Placeholder data — DCR does not publish its schemes yet."
                  : "Loaded from DCR."}
              />
              <div className="flex flex-row items-center gap-2">
                <Button
                  variant="filled"
                  tone="brand"
                  size="sm"
                  disabled={!schemeChoice || busy === "scheme"}
                  onClick={() => {
                    const chosen = schemeOptions.find((option) => option.value === schemeChoice);
                    if (!chosen) return;

                    runAction(
                      "scheme",
                      // Both fields go over: DCR consumes the id, the name is
                      // what every list and card in this app displays.
                      () => $projects.patch(activityId, {
                        certification_scheme_id: chosen.value,
                        certification_scheme_name: chosen.label,
                      }),
                      {
                        variant: "success",
                        title: "Certification scheme set",
                        description: `This activity will be registered under ${chosen.label}.`,
                      },
                    ).then((ok) => { if (ok) setEditingScheme(false); });
                  }}
                >
                  {busy === "scheme" ? "Saving…" : "Save scheme"}
                </Button>
                <Button
                  variant="text"
                  size="sm"
                  disabled={busy === "scheme"}
                  onClick={() => setEditingScheme(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outlined"
              size="sm"
              onClick={() => {
                setSchemeChoice(activity.certification_scheme_id || "");
                setEditingScheme(true);
              }}
            >
              {activity.certification_scheme_id ? "Change certification scheme" : "Set certification scheme"}
            </Button>
          )
        )}
      </Card>

      <Card
        title="Submission readiness"
        trailing={<FileTextIcon size={18} weight="duotone" />}
      >
        {readiness ? (
          <div className="ogcr-project-detail__plan">
            <div className="flex flex-row items-center gap-2">
              <Pill tone={readiness.ready ? "positive" : "warning"}>
                {readiness.ready ? "Ready to submit" : "Not ready"}
              </Pill>
              {readinessErrors.length > 0 && (
                <Pill tone="negative">{readinessErrors.length} blocking</Pill>
              )}
              {readinessWarnings.length > 0 && (
                <Pill tone="warning">{readinessWarnings.length} warning{readinessWarnings.length === 1 ? "" : "s"}</Pill>
              )}
            </div>
            {checks.length > 0 ? (
              <ul>
                {checks.map((check) => (
                  <ReadinessCheck key={check.code || check.message} check={check} />
                ))}
              </ul>
            ) : (
              <p className="text-body-s ogcr-card__subtitle">No checks reported.</p>
            )}
          </div>
        ) : (
          <div className="ogcr-project-detail__plan">
            <span className="ogcr-project-detail__label">Local completeness</span>
            <ProgressBar value={localCompleteness(activity)} />
            <p className="text-body-s ogcr-card__subtitle">
              The submission checklist is unavailable for this activity.
            </p>
          </div>
        )}
      </Card>

      <Card
        title="Attached records"
        trailing={(
          <Button
            variant="outlined"
            size="sm"
            onClick={() => navigate(`/activities/${activityId}/plans`)}
          >
            {activity.is_editable === false ? "View plans" : "Edit plans"}
          </Button>
        )}
      >
        <div className="ogcr-project-detail__grid">
          <DetailRow label="Activity plan">
            <Pill tone={activity.has_plan ? "positive" : "neutral"}>
              {activity.has_plan ? "Created" : "Not started"}
            </Pill>
          </DetailRow>
          <DetailRow label="Monitoring plan">
            <Pill tone={activity.has_monitoring_plan ? "positive" : "neutral"}>
              {activity.has_monitoring_plan ? "Created" : "Not started"}
            </Pill>
          </DetailRow>
          <DetailRow label="Parcels">
            <Button
              variant="text"
              size="sm"
              onClick={() => navigate(`/activities/${activityId}/parcels`)}
            >
              {activity.parcel_count ?? 0}
            </Button>
          </DetailRow>
          <DetailRow label="Documents">
            <Button
              variant="text"
              size="sm"
              onClick={() => navigate(`/activities/${activityId}/documents`)}
            >
              {activity.document_count ?? 0}
            </Button>
          </DetailRow>
          <DetailRow label="Submitted">{formatDate(activity.submitted_at)}</DetailRow>
          <DetailRow label="Last updated">{formatDate(activity.updated_at)}</DetailRow>
        </div>

        {missingDocuments && (
          <Message
            variant="warning"
            title="No documents attached"
            description="Documents are handed to the DCR verifiers as part of the submission: every current document on this activity and its parcels is attached to the parcel–activity verification. Anything uploaded after you submit will not be part of it."
          />
        )}
      </Card>

      {isSubmitted && (
        <Card
          title="DCR outcome"
          trailing={(
            <Button
              variant="text"
              size="sm"
              startIcon={<ArrowClockwiseIcon size={16} />}
              disabled={busy === "dcr"}
              onClick={() => runAction(
                "dcr",
                async () => { setDcrStatus(await $projects.refreshDcrStatus(activityId)); },
                { variant: "success", title: "Refreshed", description: "The DCR outcome is up to date." },
              )}
            >
              Refresh from DCR
            </Button>
          )}
        >
          {statusRefused && (
            <Message
              variant="warning"
              title="Reading outcomes may be refused"
              description={`DCR reports these roles missing: ${missingRolesLabel(dcrCapabilities.status) || "none named"}. Refreshing will still be attempted.`}
            />
          )}

          {dcrStatus ? (
            <>
              <div className="ogcr-project-detail__grid">
                <DetailRow label="Status">
                  {dcrStatus.status ? (
                    <Pill tone={projectStatusTone(dcrStatus.status)}>
                      {PROJECT_STATUS_LABELS[dcrStatus.status] || dcrStatus.status}
                    </Pill>
                  ) : "—"}
                </DetailRow>
                <DetailRow label="Parcels verified">
                  {outcomeParcels.length
                    ? `${verifiedParcels}/${outcomeParcels.length}${failedParcels ? `, ${failedParcels} failed` : ""}`
                    : "—"}
                </DetailRow>
                <DetailRow label="DCR id">{dcrStatus.dcr_id || "—"}</DetailRow>
                <DetailRow label="Checked">{formatDate(dcrStatus.checked_at)}</DetailRow>
              </div>
              <p className="text-body-s ogcr-card__subtitle">
                The activity is accepted once every parcel is verified, and rejected if any parcel fails.
              </p>
              {outcomeParcels.length > 0 && (
                <ul className="ogcr-project-detail__plan">
                  {outcomeParcels.map((parcel) => (
                    <li key={parcel.parcel}>
                      <Pill tone={verificationTone(parcel.status_code)}>
                        {verificationLabel(parcel.status_code)}
                      </Pill>
                      &nbsp;{parcel.parcel_name || parcel.name || `Parcel ${parcel.parcel}`}
                      {parcel.amount != null ? ` — ${formatTonnes(parcel.amount)}` : ""}
                      {parcel.status_message ? ` — ${parcel.status_message}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-body-s ogcr-card__subtitle">
              No outcome recorded yet. Refresh to ask DCR.
            </p>
          )}
        </Card>
      )}

      {/*
        A refusal is explained, never enforced: this is a cached read of DCR's
        permissions, and blocking the button on it would strand a user whose
        roles have since been granted. The server's own 502 is the real gate.
      */}
      {noDcrIdentity && (
        <Message
          variant="warning"
          title="This account has no DCR identity"
          description="Submitting will be refused until your account is linked to the registry."
        />
      )}

      {submitRefused && (
        <Message
          variant="warning"
          title="Your DCR account may not be allowed to submit"
          description={`DCR reports these roles missing: ${missingRolesLabel(submitCapability) || "none named"}. You can still try — this reads permissions cached from DCR and may be out of date.`}
        />
      )}

      <div className="ogcr-form-actionbar ogcr-form-actionbar--static">
        <span className="ogcr-form-actionbar__note">
          {isSubmitted
            ? "This activity has been sent to DCR."
            : (readiness && !readiness.ready
              ? "Clear the blocking checks above before submitting."
              : "Nothing reaches DCR until you submit — then the activity, its plans, parcels and documents all go at once.")}
        </span>

        {isDraft && (
          <Button
            variant="outlined"
            disabled={busy === "ready" || (readiness ? !readiness.ready : false)}
            onClick={() => runAction(
              "ready",
              () => $projects.markReady(activityId),
              { variant: "success", title: "Marked ready", description: "The activity is ready for submission." },
            )}
          >
            Mark ready
          </Button>
        )}

        {isReady && (
          <Button
            variant="outlined"
            disabled={busy === "reopen"}
            onClick={() => runAction(
              "reopen",
              () => $projects.reopen(activityId),
              { variant: "success", title: "Reopened", description: "The activity is editable again." },
            )}
          >
            Reopen
          </Button>
        )}

        {(isReady || (isSubmitted && activity.is_editable)) && (
          <Button
            variant="filled"
            tone="brand"
            startIcon={<PaperPlaneTiltIcon size={16} />}
            disabled={busy === "submit"}
            onClick={() => runAction(
              "submit",
              async () => {
                await $projects.submit(activityId);
                // The first submit is what registers the operator and grants
                // roles, so the cached DCR block is stale the moment it lands.
                refreshMe();
              },
              {
                variant: "success",
                title: "Submitted to DCR",
                description: "The activity, its plans, parcels and documents were pushed to DCR.",
              },
            )}
          >
            {busy === "submit" ? "Submitting…" : "Submit to DCR"}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Submit has three failure shapes. A 502 leaves the project editable and
 * resubmittable, so the message says which DCR entity failed rather than
 * presenting a dead end.
 */
function describeFailure(err) {
  const data = err?.response?.data;
  const httpStatus = err?.response?.status;

  if (httpStatus === 502 && data?.step) {
    const step = SUBMIT_STEP_LABELS[data.step] || data.step;
    return {
      variant: "error",
      title: `DCR rejected the ${step}`,
      description: `${data.detail || "DCR returned an error."} The activity is still editable — fix the ${step} and submit again.`,
    };
  }

  if (httpStatus === 400 && Array.isArray(data?.problems)) {
    return {
      variant: "error",
      title: "Not ready to submit",
      description: data.problems.map((problem) => problem.message || problem).join(" · "),
    };
  }

  if (httpStatus === 409) {
    return {
      variant: "warning",
      title: "Not allowed in this state",
      description: $auth.getErrorMessage(err),
    };
  }

  return {
    variant: "error",
    title: "Action failed",
    description: $auth.getErrorMessage(err),
  };
}

export default ActivityOverview;
