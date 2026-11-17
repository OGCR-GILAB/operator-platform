import { useEffect, useRef, useState } from "react";
import { ArrowClockwiseIcon, PaperPlaneTiltIcon } from "@phosphor-icons/react";
import { AlertDialog, Button, Message } from "@majistudio/ogcr-design-system";
import DetailList from "../ui/DetailList";
import ActivityTabHeader from "./ActivityTabHeader";
import ActivitySetupGuide from "./ActivitySetupGuide";
import EditActivityDetailsModal from "./EditActivityDetailsModal";
import ActivityCertification from "./ActivityCertification";
import ActivityChecklist from "./ActivityChecklist";
import ActivityDcrOutcome, { ActivityParcelResults } from "./ActivityDcrOutcome";
import ActivityDetailsCard from "./ActivityDetailsCard";
import ActivityImpact from "./ActivityImpact";
import ActivitySubmissionPanel from "./ActivitySubmissionPanel";
import { useActivity } from "./ActivityContext";
import { useGlobal } from "../providers/GlobalContext";
import $projects, { SUBMIT_STEP_LABELS } from "../../services/$projects";
import $auth from "../../services/$auth";
import { toList } from "../../services/$api";
import { isLivePermissions, liveCapabilityOf, missingRolesLabel } from "../../models/dcr";
import useDcrPermissions from "../profile/useDcrPermissions";
import {
  formatDate,
  groupChecks,
  parcelHasOwnVerdict,
  parcelLabelOf,
} from "../projects/projectPresentation";

function ActivityOverview() {
  const { activityId, activity, readiness, parcels, documentTotal, reload } = useActivity();
  const { operator, dcrState, dcrCapabilities, refreshMe, refreshOperator } = useGlobal();

  // Held with the activity it describes, so another activity's outcome never shows.
  const [dcrScope, setDcrScope] = useState({ forId: null, record: null });
  const dcrStatus = dcrScope.forId === activityId ? dcrScope.record : null;
  // Why the last read failed, when it was not simply "nothing recorded yet".
  const dcrLoadError = dcrScope.forId === activityId ? dcrScope.error || "" : "";
  const setDcrStatus = (record) => setDcrScope({ forId: activityId, record });
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState("");

  // A refused submit outlives the transient notice: a DCR failure keeps its
  // "Try again" next to the submit button, and readiness problems stay flagged
  // on the checklist until the next attempt. Held per activity, like dcrScope.
  const [failureScope, setFailureScope] = useState({ forId: null, failure: null });
  const submitFailure = failureScope.forId === activityId ? failureScope.failure : null;
  const setSubmitFailure = (failure) => setFailureScope({ forId: activityId, failure });
  const readinessRef = useRef(null);
  // The submission panel carries the summary, so the full checklist folds away
  // until asked for (or until a submit is refused over it).
  const [showChecks, setShowChecks] = useState(false);
  // The checklist mounts only once opened, so scrolling to it waits a render.
  const [checksScroll, setChecksScroll] = useState(0);
  const [editingDetails, setEditingDetails] = useState(false);
  // Submit writes to the registry and freezes the activity, so every path to
  // it — the first attempt and a retry — goes through this confirmation.
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);

  const submittedStatus = activity?.status;
  const hasBeenSubmitted = Boolean(activity?.submitted_at)
    || ["submitted", "changes_requested", "accepted", "rejected"].includes(submittedStatus);

  // Only worth asking DCR while a submit is still possible.
  const dcrPermissions = useDcrPermissions({
    enabled: Boolean(activity) && activity.is_editable !== false && dcrState === "linked",
  });

  // The server re-reads every submitted activity from DCR every 15 minutes, so
  // a plain GET on load is enough; asking DCR right away is the explicit
  // "Refresh now" below. Nothing recorded yet (404 / 409) is not an error.
  useEffect(() => {
    if (!activityId || !hasBeenSubmitted) return undefined;

    let cancelled = false;

    $projects.dcrStatus(activityId)
      .then((record) => { if (!cancelled) setDcrScope({ forId: activityId, record }); })
      .catch((err) => {
        if (cancelled) return;
        const httpStatus = err?.response?.status;
        // 401 is handled globally; 404 / 409 just mean no outcome yet.
        const error = [401, 404, 409].includes(httpStatus) ? "" : $auth.getErrorMessage(err);
        setDcrScope({ forId: activityId, record: null, error });
      });

    return () => { cancelled = true; };
  }, [activityId, hasBeenSubmitted, submittedStatus]);

  // "Check again" refreshes the API's role cache; readiness (its `dcr.roles`
  // warning) is read again only once that re-check has landed.
  const recheckPendingRef = useRef(false);
  const recheckPermissions = () => {
    recheckPendingRef.current = true;
    dcrPermissions.reload({ refresh: true });
  };

  const recheckAction = {
    actionLabel: dcrPermissions.loading ? "Checking…" : "Check again",
    onAction: () => { if (!dcrPermissions.loading) recheckPermissions(); },
  };

  useEffect(() => {
    if (checksScroll) readinessRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [checksScroll]);

  useEffect(() => {
    if (dcrPermissions.loading || !recheckPendingRef.current) return;
    recheckPendingRef.current = false;
    reload();
  }, [dcrPermissions.loading, reload]);

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

  const handleSubmit = async () => {
    const resubmitting = Boolean(activity?.submitted_at);
    setBusy("submit");
    setNotice(null);

    try {
      await $projects.submit(activityId);
      setSubmitFailure(null);
      setNotice(resubmitting ? {
        variant: "success",
        title: "Resubmitted to DCR",
        description: "The existing DCR records were updated. The certifier picks the activity up again from here.",
      } : {
        variant: "success",
        title: "Submitted to DCR",
        description: "The activity and its plans were sent to DCR. The certification platform registers its parcels there within a minute or so. Documents stay here for the certifier to fetch.",
      });
      // The first submit is what registers the operator and grants roles, so
      // the cached DCR block is stale the moment it lands.
      refreshMe();
    } catch (err) {
      const failure = submitFailureOf(err);
      setSubmitFailure(failure);

      // The API checked the roles live before refusing, so its cache is fresh.
      if (failure?.kind === "permissions") dcrPermissions.reload();

      if (failure?.kind === "problems") {
        setChecksScroll((count) => count + 1);
      } else if (!failure && err?.response?.status !== 401) {
        setNotice(describeFailure(err));
      }
    } finally {
      // Whatever DCR accepted before a failing step stays synced (the operator
      // gets its `dcr_id`, parcels their badges), and a 400 means readiness
      // changed under us — reload both either way.
      refreshOperator();
      reload();
      setBusy("");
    }
  };

  if (!activity) return null;

  const isDraft = activity.status === "draft";
  const isReady = activity.status === "ready";
  const isSubmitted = Boolean(activity.submitted_at)
    || ["submitted", "changes_requested", "accepted", "rejected"].includes(activity.status);
  const isResubmit = Boolean(activity.submitted_at);

  // The certifier sent the activity back. The status says so as soon as the
  // activity loads; `dcr-status` adds the stage and the certifier's message.
  const amendment = dcrStatus?.amendment || null;
  const changesRequested = activity.status === "changes_requested" || Boolean(amendment);
  const amendmentStage = amendment?.stage ? `${amendment.stage} stage` : "";

  // The certifier verifies the activity as a whole; a parcel is listed only once
  // it has a result of its own (`has_verdict`). `dcr-status` names the parcels;
  // the activity's parcels are only the fallback.
  const outcomeParcels = toList(dcrStatus?.parcels).filter(parcelHasOwnVerdict);
  const parcelNameOf = (id) => parcelLabelOf(
    (parcels || []).find((parcel) => String(parcel.id) === String(id)) || { id },
  );

  // errors[] / warnings[] are plain messages or `{code, message, values}` (the
  // vocabulary warnings). Most repeat a check; the rest (the live `dcr.roles`
  // warning among them) would otherwise only be counted.
  const readinessErrors = toList(readiness?.errors).map(problemAsCheck);
  const readinessWarnings = toList(readiness?.warnings).map(problemAsCheck);
  const checks = toList(readiness?.checks);

  const problems = submitFailure?.kind === "problems" ? submitFailure.problems : [];
  const isFlagged = (check) => problems.some((problem) => problemMatches(problem, check));
  const unmatchedProblems = problems.filter(
    (problem) => !checks.some((check) => problemMatches(problem, check)),
  );

  const isListedCheck = (entry) => checks.some((check) => problemMatches(entry, check))
    || unmatchedProblems.some((problem) => problemMatches(problem, entry));
  const extraReadiness = [
    ...readinessErrors.filter((entry) => !isListedCheck(entry))
      .map((entry) => ({ ok: false, level: "error", ...entry })),
    ...readinessWarnings.filter((entry) => !isListedCheck(entry))
      .map((entry) => ({ ok: false, level: "warning", ...entry })),
  ];
  // A check keeps the values its matching error / warning lists.
  const withValues = (check) => (check.values ? check : {
    ...check,
    values: [...readinessErrors, ...readinessWarnings]
      .find((entry) => problemMatches(entry, check))?.values,
  });

  // Everything the checklist lists: refused-submit problems no check covers,
  // errors / warnings no check repeats, then the checks themselves.
  const allChecks = [
    ...unmatchedProblems.map((problem) => ({ ok: false, level: "error", ...problemAsCheck(problem), flagged: true })),
    ...extraReadiness,
    ...checks.map((check) => ({ ...withValues(check), flagged: isFlagged(check) })),
  ];
  const { blocking, warnings } = groupChecks(allChecks);

  const dcrFailure = submitFailure?.kind === "dcr" ? submitFailure : null;
  const isEditable = activity.is_editable !== false;

  // The live check (`auth/dcr/permissions/`) wins over the login-time list in
  // `auth/me/`. `allowed` is null until either has answered — only an explicit
  // `false` is worth acting on, so a slow or failed read never raises an alarm.
  const livePermissions = dcrPermissions.permissions;
  const submitCapability = livePermissions
    ? liveCapabilityOf(livePermissions, "submit")
    : dcrCapabilities?.submit;
  const refusalBankId = livePermissions?.bank_id;
  const atBank = (bankId) => (bankId ? ` at bank ${bankId}` : "");
  // Blocked only on DCR's own role-by-role answer; the profile fallback can be
  // stale, so it warns and leaves the API's 403 as the gate.
  const submitBlocked = isEditable
    && isLivePermissions(livePermissions)
    && submitCapability?.allowed === false;
  const submitRefused = isEditable && !submitBlocked && submitCapability?.allowed === false;
  const unconfirmedRoles = isEditable && submitCapability?.allowed !== false
    ? (submitCapability?.unknown_roles || [])
    : [];
  // A 403 is stale once a re-check finds the roles granted.
  const permissionFailure = submitFailure?.kind === "permissions" && submitCapability?.allowed !== true
    ? submitFailure
    : null;
  const statusRefused = dcrCapabilities?.status?.allowed === false;
  const noDcrIdentity = !isSubmitted && dcrState === "local_only";

  const checksOpen = showChecks || problems.length > 0;

  const reviewChecks = () => {
    setShowChecks(true);
    setChecksScroll((count) => count + 1);
  };

  // A DCR failure must never strand the activity: if it is still editable,
  // resubmitting stays on offer whatever its status became.
  const canSubmit = isReady || (isSubmitted && activity.is_editable) || Boolean(dcrFailure && isEditable);

  const panelState = (() => {
    if (changesRequested) {
      return {
        state: "changes",
        title: "Changes requested",
        note: `The certifier asked for changes${amendmentStage ? ` at the ${amendmentStage}` : ""}. Update the activity, then resubmit.`,
      };
    }
    if (isSubmitted) {
      return { state: "submitted", title: "Sent to DCR", note: `Submitted ${formatDate(activity.submitted_at)}.` };
    }
    if (!readiness) {
      return { state: "unknown", title: "Checklist unavailable", note: "The submission checklist could not be read for this activity." };
    }
    if (readiness.ready) {
      return {
        state: "ready",
        title: "Ready to submit",
        note: isReady
          ? "The activity and its plans go to DCR, and the certification platform then registers its parcels. Documents stay here for the certifier."
          : "Every blocking check passes. Mark it ready, then submit.",
      };
    }
    return { state: "blocked", title: "Not ready to submit", note: "Clear the blocking checks first." };
  })();

  /*
    Submit is disabled only on DCR's live, role-by-role answer, and "Check
    again" re-asks DCR so a freshly granted role unblocks it at once. The
    login-time fallback only warns; the API's 403 stays the real gate.
  */
  const submitAlerts = (
    <>
      {noDcrIdentity && (
        <Message
          state="warning"
          title="No DCR identity"
          description="Link your account to the registry before submitting."
        />
      )}

      {submitBlocked && !permissionFailure && (
        <Message
          state="error"
          title="DCR roles missing"
          description={`Missing${atBank(refusalBankId)}: ${missingRolesLabel(submitCapability) || "none named"}. Ask the registry to grant them, then check again.`}
          {...recheckAction}
        />
      )}

      {submitRefused && (
        <Message
          state="warning"
          title="DCR roles may be missing"
          description={`From your last sign-in: ${missingRolesLabel(submitCapability) || "none named"}. DCR could not be asked live — you can still try.`}
          {...recheckAction}
        />
      )}

      {unconfirmedRoles.length > 0 && (
        <Message
          state="warning"
          title="Roles not confirmed"
          description={`DCR did not confirm: ${unconfirmedRoles.join(", ")}. Submitting may be refused.`}
        />
      )}

      {permissionFailure && (
        <Message
          state="error"
          title="Submit refused — roles missing"
          description={[
            permissionFailure.detail,
            permissionFailure.missingRoles.length
              ? `Missing${atBank(permissionFailure.bankId)}: ${permissionFailure.missingRoles.join(", ")}.`
              : "",
            "Nothing was sent to DCR.",
          ].filter(Boolean).join(" ")}
          {...recheckAction}
        />
      )}

      {dcrFailure && (
        <Message
          state="error"
          title={`DCR rejected the ${dcrFailure.stepLabel}`}
          description={`${dcrFailure.detail || "DCR returned an error."} Earlier steps stay synced and are updated, not duplicated, on the next try.`}
          actionLabel={busy === "submit" ? "Submitting…" : "Try again"}
          onAction={() => { if (busy !== "submit") setConfirmingSubmit(true); }}
        />
      )}
    </>
  );

  const submitActions = (canSubmit || isDraft || isReady) ? (
    <>
      {canSubmit && (
        <Button
          variant="filled"
          iconLeft={<PaperPlaneTiltIcon size={16} />}
          disabled={busy === "submit" || submitBlocked}
          onClick={() => setConfirmingSubmit(true)}
        >
          {busy === "submit" ? "Submitting…" : (isResubmit ? "Resubmit to DCR" : "Submit to DCR")}
        </Button>
      )}

      {isDraft && (
        <Button
          variant={canSubmit ? "outlined" : "filled"}
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
    </>
  ) : null;

  const checklist = checksOpen && (readiness || problems.length > 0) ? (
    <div ref={readinessRef} className="ogcr-activity-overview__anchor">
      <ActivityChecklist
        checks={allChecks}
        refusal={problems.length > 0 ? submitFailure : null}
        hideDisabled={problems.length > 0}
        onHide={() => setShowChecks(false)}
      />
    </div>
  ) : null;

  return (
    <div className="ogcr-activity-tab">
      <ActivityTabHeader
        description="Where this activity stands, what is still missing, and the actions that move it towards DCR."
        actions={(
          <Button
            variant="text"
            iconLeft={<ArrowClockwiseIcon size={16} />}
            onClick={reload}
          >
            Refresh
          </Button>
        )}
      />

      {Boolean(notice) && (
        <Message
          state={notice.variant}
          title={notice.title}
          description={notice.description}
          onDismiss={() => setNotice(null)}
        />
      )}

      {changesRequested && (
        <Message
          state="warning"
          title={`The certifier asked for changes${amendmentStage ? ` (${amendmentStage})` : ""}`}
          description={amendment?.message || "Make the requested changes, then resubmit."}
          // Only offered while a resubmit can actually go through.
          actionLabel={busy === "submit" ? "Submitting…" : (!submitBlocked && isEditable ? "Resubmit to DCR" : undefined)}
          onAction={() => { if (busy !== "submit") setConfirmingSubmit(true); }}
        />
      )}

      <div className="ogcr-activity-overview">
        <div className="ogcr-activity-overview__main">
          {!isSubmitted && (
            <ActivitySetupGuide
              activity={activity}
              readiness={readiness}
              editable={isEditable}
              onEditDetails={() => setEditingDetails(true)}
              onReviewChecks={reviewChecks}
            />
          )}
          {(!isSubmitted || changesRequested) && checklist}

          {isSubmitted && <ActivityCertification dcrStatus={dcrStatus} />}
          {isSubmitted && outcomeParcels.length > 0 && (
            <ActivityParcelResults parcels={outcomeParcels} nameOf={parcelNameOf} />
          )}

          <ActivityDetailsCard
            activity={activity}
            operator={operator}
            isSubmitted={isSubmitted}
            documentTotal={documentTotal}
            onEditDetails={() => setEditingDetails(true)}
            savingScheme={busy === "scheme"}
            onSaveScheme={(chosen) => runAction(
              "scheme",
              // Both fields go over: DCR consumes the id, the name is what
              // every list and card in this app displays.
              () => $projects.patch(activityId, {
                certification_scheme_id: chosen.value,
                certification_scheme_name: chosen.label,
              }),
              {
                variant: "success",
                title: "Certification scheme set",
                description: `This activity will be registered under ${chosen.label}.`,
              },
            )}
          />

          <ActivityImpact activity={activity} />

          {isSubmitted && !changesRequested && checklist}
        </div>

        <aside className="ogcr-activity-overview__aside" aria-label="Submission">
          {isSubmitted && (
            <ActivityDcrOutcome
              dcrStatus={dcrStatus}
              loadError={dcrLoadError}
              refreshing={busy === "dcr"}
              refusedRoles={statusRefused ? (missingRolesLabel(dcrCapabilities.status) || "") : null}
              parcelNameOf={parcelNameOf}
              onRefresh={() => runAction(
                "dcr",
                async () => { setDcrStatus(await $projects.refreshDcrStatus(activityId)); },
                { variant: "success", title: "Refreshed", description: "The DCR outcome is up to date." },
              )}
            />
          )}

          <ActivitySubmissionPanel
            {...panelState}
            // A resubmit is checked like a first submit, so the counts matter again.
            blocking={isSubmitted && !changesRequested ? 0 : blocking.length}
            warnings={isSubmitted && !changesRequested ? 0 : warnings.length}
            alerts={submitAlerts}
            actions={submitActions}
            checkCount={readiness ? allChecks.length : 0}
            checksOpen={checksOpen}
            onViewChecks={reviewChecks}
          />
        </aside>
      </div>

      <AlertDialog
        open={confirmingSubmit}
        onOpenChange={(open) => { if (!open) setConfirmingSubmit(false); }}
        title={isResubmit ? "Resubmit to DCR?" : "Submit to DCR?"}
        description={isResubmit
          ? "This updates the activity's existing records on the DCR registry."
          : "This creates records on the DCR registry."}
        confirmLabel={isResubmit ? "Resubmit" : "Submit"}
        onConfirm={handleSubmit}
      >
        <div className="ogcr-form-stack">
          <DetailList>
            <DetailList.Item label="Activity">{activity.name || "Unnamed activity"}</DetailList.Item>
            <DetailList.Item label="Operator">{activity.operator_name}</DetailList.Item>
            <DetailList.Item label="Parcels">{String(activity.parcel_count ?? 0)}</DetailList.Item>
            <DetailList.Item label="Documents">{String(documentTotal ?? 0)}</DetailList.Item>
          </DetailList>
          {isResubmit ? (
            <p className="text-body-s ogcr-card__subtitle">
              The records already on DCR are updated with your changes, not
              duplicated. Parcels you removed from this activity are also removed
              from it on DCR. Documents stay on the Operator Platform for the
              certifier to fetch.
            </p>
          ) : (
            <p className="text-body-s ogcr-card__subtitle">
              The activity and its activity and monitoring plans are sent to DCR.
              Within a minute or so the certification platform reads the
              parcels from here and registers them on DCR. The declared owners
              are sent to DCR as soon as their parcel is registered. Documents
              stay on the Operator Platform; certifiers fetch
              them from here during the audit, so upload them before the
              activity is assigned to an auditor.
            </p>
          )}
          <Message
            state="warning"
            title={isResubmit ? "Read-only again after resubmitting" : "Locked after submission"}
            description={isResubmit
              ? "The activity goes back to the certifier and can no longer be changed here unless they ask for changes again."
              : "Once DCR accepts the submission, this activity and its plans can no longer be changed here, nor can its parcels once they are registered. Documents and declared owners stay editable until the verification is final."}
          />
        </div>
      </AlertDialog>

      {editingDetails && (
        <EditActivityDetailsModal
          activity={activity}
          onClose={() => setEditingDetails(false)}
          onSaved={() => {
            setEditingDetails(false);
            setNotice({
              variant: "success",
              title: "Details saved",
              description: "They stay on this platform until the activity is submitted to DCR.",
            });
            reload();
          }}
        />
      )}
    </div>
  );
}

/** Re-asks DCR for the account's roles, skipping the API's 5-minute cache. */
/**
 * The submit refusals that get their own UI, or null for anything else.
 * 502 -> `{detail, step}`: a DCR call failed at `step`; the project stays
 * editable and resubmittable. 403 -> `{detail, step: "permissions", bank_id,
 * missing_roles[]}`: refused before any DCR write. 400 -> `{detail, problems[]}`:
 * the readiness list.
 */
function submitFailureOf(err) {
  const data = err?.response?.data;
  const httpStatus = err?.response?.status;

  if (httpStatus === 403 && data?.step === "permissions") {
    return {
      kind: "permissions",
      detail: data.detail || "",
      bankId: data.bank_id || "",
      missingRoles: toList(data.missing_roles),
    };
  }

  if (httpStatus === 502 && data?.step) {
    return {
      kind: "dcr",
      step: data.step,
      stepLabel: SUBMIT_STEP_LABELS[data.step] || String(data.step).replace(/_/g, " "),
      detail: data.detail || "",
    };
  }

  if (httpStatus === 400 && Array.isArray(data?.problems)) {
    return { kind: "problems", detail: data.detail || "", problems: data.problems };
  }

  return null;
}

// `problems[]` mirrors readiness, so entries are check-like `{code, message}`
// objects — or bare strings from an older backend. Match on code, else message.
const problemAsCheck = (problem) => (
  typeof problem === "string" ? { message: problem } : (problem || {})
);

function problemMatches(problem, check) {
  const { code, message } = problemAsCheck(problem);
  if (code && check.code) return code === check.code;
  return Boolean(message) && message === check.message;
}

/** Failures of the non-submit actions (scheme, mark ready, reopen, refresh). */
function describeFailure(err) {
  const httpStatus = err?.response?.status;

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
