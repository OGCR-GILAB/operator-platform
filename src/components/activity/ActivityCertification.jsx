import { useState } from "react";
import { Button, Card, Pill } from "@majistudio/ogcr-design-system";
import { DetailGroup } from "../ui/DetailList";
import StatStrip from "../ui/StatStrip";
import { toList } from "../../services/$api";
import { benefitItems, formatDate } from "../projects/projectPresentation";

// What the certification platform writes to DCR. These are DCR's own records,
// passed through unchanged, so every field may be missing or null and only
// the filled ones are shown.

const CURRENT_CERTIFICATE_STATUSES = ["certified", "active"];

const certificateTone = (status) => {
  if (CURRENT_CERTIFICATE_STATUSES.includes(status)) return "positive";
  if (status === "suspended") return "warning";
  return "neutral";
};

// Longer than this, an audit summary starts folded to a few lines.
const SUMMARY_FOLD_LENGTH = 240;

const humanise = (value) => String(value || "").replace(/_/g, " ");

const capitalise = (value) => {
  const text = humanise(value);
  return text ? text[0].toUpperCase() + text.slice(1) : "—";
};

const isFilled = (value) => value != null && value !== "";

/**
 * A certificate's validity from whichever dates are filled: both as a range
 * (after `rangePrefix`), one alone as "Issued …" / "Expires …", none as "".
 */
const validityOf = (record, rangePrefix = "") => {
  const issued = isFilled(record?.issue_date) ? formatDate(record.issue_date) : "";
  const expires = isFilled(record?.expiry_date) ? formatDate(record.expiry_date) : "";
  if (issued && expires) return `${rangePrefix}${issued} → ${expires}`;
  if (issued) return `Issued ${issued}`;
  if (expires) return `Expires ${expires}`;
  return "";
};

/**
 * `unit_types` and `non_conformities_list` arrive as a list or a single value;
 * a single string may hold one entry per line.
 */
const listOf = (value) => {
  if (!isFilled(value)) return [];
  if (Array.isArray(value)) return value.filter(isFilled);
  if (typeof value === "string") return value.split("\n").map((line) => line.trim()).filter(Boolean);
  return [value];
};

const textOf = (item) => {
  if (item == null) return "";
  if (typeof item !== "object") return String(item);
  return item.description || item.summary || item.title || item.name || JSON.stringify(item);
};

const idOf = (record) => record?.id
  ?? record?.certificate_of_compliance_id
  ?? record?.certificate_id
  ?? record?.audit_report_id;

/** `certificate` and its row in `certificates` are separate objects in the response. */
const sameRecord = (a, b) => {
  if (!a || !b) return false;
  const id = idOf(a);
  if (id != null && idOf(b) != null) return id === idOf(b);
  return JSON.stringify(a) === JSON.stringify(b);
};

const recordKey = (record, index) => idOf(record) ?? index;

function CertificateSummary({ certificate }) {
  const unitTypes = listOf(certificate.unit_types);
  const validity = validityOf(certificate, "Valid ");

  return (
    <>
      <div className="ogcr-certificate__head">
        {isFilled(certificate.certification_status) && (
          <Pill tone={certificateTone(certificate.certification_status)}>
            {capitalise(certificate.certification_status)}
          </Pill>
        )}
        {validity && <span className="ogcr-certificate__validity">{validity}</span>}
        {unitTypes.map((unit) => <Pill key={unit} tone="neutral">{unit}</Pill>)}
      </div>
      <StatStrip
        variant="bare"
        ariaLabel="Certified amounts"
        items={benefitItems(certificate)}
      />
    </>
  );
}

function AuditReport({ report }) {
  const [expanded, setExpanded] = useState(false);
  const nonConformities = listOf(report.non_conformities_list);
  const summary = isFilled(report.audit_report_summary) ? String(report.audit_report_summary) : "";
  const foldable = summary.length > SUMMARY_FOLD_LENGTH;
  const meta = [
    isFilled(report.audit_report_issue_date) ? `Report issued ${formatDate(report.audit_report_issue_date)}` : "",
    isFilled(report.certification_body_id) ? `Certification body ${report.certification_body_id}` : "",
  ].filter(Boolean);

  return (
    <li className="ogcr-record-list__item">
      <div className="ogcr-record-list__heading">
        <span className="ogcr-record-list__title">
          {isFilled(report.audit_date) ? `Audit of ${formatDate(report.audit_date)}` : "Audit"}
        </span>
        {nonConformities.length > 0 && (
          <Pill tone="warning">
            {nonConformities.length} non-conformit{nonConformities.length === 1 ? "y" : "ies"}
          </Pill>
        )}
      </div>
      {meta.length > 0 && <p className="ogcr-record-list__meta">{meta.join(" · ")}</p>}

      {summary && (
        <div className="ogcr-record-list__summary">
          <p className={`text-body-s${foldable && !expanded ? " is-folded" : ""}`}>{summary}</p>
          {foldable && (
            <Button variant="text" size="s" onClick={() => setExpanded((current) => !current)}>
              {expanded ? "Show less" : "Show more"}
            </Button>
          )}
        </div>
      )}

      {nonConformities.length > 0 && (
        <div>
          <span className="ogcr-project-detail__label">To address</span>
          <ul className="ogcr-record-list__bullets">
            {nonConformities.map((item, index) => (
              <li key={index}>{textOf(item)}</li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

/**
 * The current certificate of compliance, the audit reports and the older
 * certificates, as `dcr-status` last reported them. Shown once the activity
 * is submitted; stays an empty state until the certifier records something.
 */
function ActivityCertification({ dcrStatus }) {
  const certificates = toList(dcrStatus?.certificates);
  const auditReports = toList(dcrStatus?.audit_reports);
  const current = dcrStatus?.certificate || null;
  const history = certificates.filter((item) => !sameRecord(item, current));
  const isEmpty = !current && !history.length && !auditReports.length;

  return (
    <Card title="Certification" subtitle="Recorded on DCR by the certification platform.">
      {isEmpty ? (
        <p className="text-body-s ogcr-card__subtitle">
          No certificate or audit report on DCR yet. They appear here once the certifier records them —
          use Refresh in the DCR outcome panel to check now.
        </p>
      ) : (
        <>
          <DetailGroup title="Current certificate">
            {current ? (
              <CertificateSummary certificate={current} />
            ) : (
              <p className="text-body-s ogcr-card__subtitle">No certificate is currently in force.</p>
            )}
          </DetailGroup>

          {auditReports.length > 0 && (
            <DetailGroup title="Audit reports" count={auditReports.length}>
              <ul className="ogcr-record-list">
                {auditReports.map((report, index) => (
                  <AuditReport key={recordKey(report, index)} report={report} />
                ))}
              </ul>
            </DetailGroup>
          )}

          {history.length > 0 && (
            <details className="ogcr-disclosure">
              <summary>
                Certificate history
                <span className="ogcr-activity-tab__count">{history.length}</span>
              </summary>
              <ul className="ogcr-record-list">
                {history.map((item, index) => {
                  const unitTypes = listOf(item.unit_types);
                  const period = validityOf(item);

                  return (
                    <li key={recordKey(item, index)} className="ogcr-record-list__item ogcr-record-list__heading">
                      {isFilled(item.certification_status) && (
                        <Pill tone={certificateTone(item.certification_status)}>
                          {capitalise(item.certification_status)}
                        </Pill>
                      )}
                      {period && <span>{period}</span>}
                      {unitTypes.length > 0 && <span className="ogcr-record-list__meta">{unitTypes.join(", ")}</span>}
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </>
      )}
    </Card>
  );
}

export default ActivityCertification;
