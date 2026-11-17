import { Button, Pill } from "@majistudio/ogcr-design-system";
import { REGISTRY_OWNER_RIGHT, sortRegistryOwners } from "../projects/projectPresentation";

/**
 * Who the land registry says holds a French parcel (`parcels/{id}/registry-owners/`),
 * shown next to the declared owner so the operator sees what the auditor will
 * compare. Only legal persons are published (companies, GAEC/GFA/SCI, public
 * bodies), so an empty list is the usual case for farmland. Read-only:
 * `onUse` copies an owner (`P`) row into the declaration form.
 */
function LandRegistryOwners({ registry, error = "", canUse = false, onUse }) {
  const owners = sortRegistryOwners(registry?.owners);
  const caption = [registry?.source, registry?.vintage].filter(Boolean).join(", ");

  return (
    <section className="ogcr-form-section" aria-labelledby="ownership-registry-title">
      <div className="ogcr-form-section__header">
        <h4 id="ownership-registry-title" className="ogcr-form-section__title">Land registry</h4>
      </div>

      {error ? (
        <p className="text-body-s ogcr-card__subtitle">Could not load the land registry: {error}</p>
      ) : (
        <>
          {owners.length ? (
            <ul className="ogcr-registry-owners">
              {owners.map((holder, index) => {
                const isOwner = holder.right_code === REGISTRY_OWNER_RIGHT;
                const details = [holder.legal_form, holder.siren && `SIREN ${holder.siren}`]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <li key={`${holder.siren || holder.legal_name}-${holder.right_code}-${index}`} className="ogcr-registry-owners__row">
                    <div className="ogcr-registry-owners__holder">
                      <span className="ogcr-registry-owners__name">{holder.legal_name || "—"}</span>
                      {details && <span className="text-body-s ogcr-card__subtitle">{details}</span>}
                    </div>
                    <div className="ogcr-registry-owners__actions">
                      <Pill tone={isOwner ? "positive" : "neutral"}>
                        {holder.right_label || holder.right_code || "—"}
                      </Pill>
                      {isOwner && canUse && (
                        <Button variant="text" size="s" onClick={() => onUse?.(holder)}>
                          Use as declared owner
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-body-s ogcr-card__subtitle">
              No company or public body holds this parcel in the registry; private owners are not published.
            </p>
          )}

          {caption && (
            <p className="text-body-s ogcr-card__subtitle">
              Source:{" "}
              {registry.source_url ? (
                <a href={registry.source_url} target="_blank" rel="noreferrer noopener">{caption}</a>
              ) : caption}
            </p>
          )}
        </>
      )}
    </section>
  );
}

export default LandRegistryOwners;
