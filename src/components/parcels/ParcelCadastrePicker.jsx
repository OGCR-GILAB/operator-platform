import { useCallback, useEffect, useRef, useState } from "react";
import { BroomIcon, CheckCircleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import Loader from "../ui/Loader";
import $map from "../../services/$map";
import $cadastre, { parcelId, parcelLabel } from "../../services/$cadastre";
import $auth from "../../services/$auth";
import { describeGeometry, extractGeometry } from "./geometry";

const emptyFields = { code_insee: "", section: "", numero: "" };

const asCollection = (features) => ({ type: "FeatureCollection", features });

/**
 * Pick a parcel off the French cadastre: search by code_insee / section /
 * numero, click a result on the map, confirm. The geometry and the full
 * cadastral id (IDU) always come from the same APICarto feature, so the two
 * cannot disagree.
 */
function ParcelCadastrePicker({ value, onChange, disabled = false, error }) {
  const mapElement = useRef();
  // Read by the map-click handler, which subscribes once and must not be torn
  // down and rebuilt every time a search lands.
  const resultsRef = useRef([]);
  const confirmedRef = useRef(false);

  const [fields, setFields] = useState(emptyFields);
  const [selected, setSelected] = useState(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState("");
  const [problem, setProblem] = useState("");

  const isConfirmed = Boolean(value?.geometry);
  // A confirmed parcel is settled: searching or clicking the map would replace
  // what is drawn without replacing what would be saved. Change selection first.
  const locked = disabled || isConfirmed;

  const handleFieldChange = (key) => (event) => {
    const next = event.target.value;
    setFields((current) => ({ ...current, [key]: next }));
  };

  const select = useCallback((feature, prefix) => {
    setSelected(feature);
    $map.setSelectedCadastreParcel(feature.properties?.idu);
    $map.fitToFeatures(asCollection([feature]), { padding: 60, maxZoom: 18 });
    setMessage(`${prefix} ${parcelLabel(feature)}.`);
  }, []);

  /**
   * Shared by the Search button and by a click on the vector tiles, which
   * re-runs the lookup with the codes it read off the tile. `preferIdu` is that
   * tile's parcel id: a commune with several prefixes can hold more than one
   * parcel at the same section/numero, and the clicked one should win.
   */
  const runSearch = useCallback(async (query, preferIdu) => {
    setProblem("");
    setSearching(true);

    try {
      const collection = await $cadastre.parcelle(query);
      const features = collection?.features || [];

      resultsRef.current = features;
      $map.setCadastreResults(asCollection(features));

      if (!features.length) {
        setSelected(null);
        $map.setSelectedCadastreParcel(null);
        setMessage("No parcel found for those codes.");
        return;
      }

      const preferred = preferIdu
        && features.find((feature) => feature.properties?.idu === preferIdu);

      if (preferred) {
        select(preferred, "Selected");
        return;
      }

      if (features.length === 1) {
        select(features[0], "Found");
        return;
      }

      setSelected(null);
      $map.setSelectedCadastreParcel(null);
      $map.fitToFeatures(asCollection(features));

      // APICarto caps the response, so a broad search says so rather than
      // pretending the commune only has 500 parcels.
      const total = collection?.totalFeatures ?? features.length;
      setMessage(total > features.length
        ? `${total} parcels match — showing the first ${features.length}. Add a section or numéro to narrow it down.`
        : `${features.length} parcels found — click one to select it.`);
    } catch (err) {
      if (err?.response?.status === 401) return;

      resultsRef.current = [];
      setSelected(null);
      setMessage("");
      setProblem(err?.response ? $auth.getErrorMessage(err) : err.message);
    } finally {
      setSearching(false);
    }
  }, [select]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (locked || searching || !fields.code_insee.trim()) return;

    runSearch(fields);
  };

  const handleClear = () => {
    setFields(emptyFields);
    resultsRef.current = [];
    setSelected(null);
    setMessage("");
    setProblem("");
    $map.clearCadastreResults();
  };

  const handleConfirm = () => {
    if (!selected) return;

    // Same normalisation the pasted-GeoJSON path used, so a MultiPolygon or a
    // bare Feature is handled identically.
    const { geometry, error: problemText } = extractGeometry(selected);

    if (!geometry) {
      setProblem(problemText || "That parcel has no usable geometry.");
      return;
    }

    onChange({
      geometry,
      idu: parcelId(selected.properties),
      label: parcelLabel(selected),
    });
  };

  const handleChangeSelection = () => {
    const previous = resultsRef.current;

    onChange(null);
    setSelected(null);

    // The confirmed parcel replaced the search results on the map; put them back.
    $map.setSelectedCadastreParcel(null);
    $map.setCadastreResults(asCollection(previous));
    setMessage(previous.length ? "Click a parcel to select it." : "");
  };

  // Read by the map-click handler, which subscribes once and so cannot close
  // over the current value.
  useEffect(() => {
    confirmedRef.current = isConfirmed;
  }, [isConfirmed]);

  useEffect(() => {
    // Picking a parcel is the one place the cadastre and the administrative
    // regions belong — they are how you find the thing you are about to add.
    const element = mapElement.current;
    $map.init({ element, cadastre: true });

    return () => {
      $map.clearCadastreResults();
      $map.destroy(element);
    };
  }, []);

  // Wire up map clicks once, after the style is ready.
  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    const attach = () => {
      if (cancelled) return;

      unsubscribe = $map.onCadastreClick((parcel) => {
        if (confirmedRef.current) return;

        if (parcel.source === "search") {
          const match = resultsRef.current.find(
            (feature) => feature.properties?.idu === parcel.idu,
          );
          if (!match) return;

          select(match, "Selected");
          return;
        }

        // Off the tiles: take the codes, but let APICarto supply the geometry —
        // tile geometry is clipped and simplified.
        const query = {
          code_insee: parcel.code_insee || "",
          section: parcel.section || "",
          numero: parcel.numero || "",
        };

        setFields(query);
        if (query.code_insee) runSearch(query, parcel.idu);
      });
    };

    if ($map.instance?.isStyleLoaded?.()) {
      attach();
    } else {
      $map.instance?.once?.("load", attach);
    }

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [runSearch, select]);

  // A parcel already on the record: show it so the operator sees what is stored.
  useEffect(() => {
    if (!value?.geometry) return;

    const collection = asCollection([{
      type: "Feature",
      geometry: value.geometry,
      properties: { idu: value.idu || "current" },
    }]);

    const draw = () => {
      $map.setCadastreResults(collection);
      $map.setSelectedCadastreParcel(value.idu || "current");
      $map.fitToFeatures(collection, { padding: 60, maxZoom: 18 });
    };

    if ($map.instance?.isStyleLoaded?.()) {
      draw();
    } else {
      $map.instance?.once?.("load", draw);
    }
    // Only when a confirmed selection arrives or changes.
  }, [value?.geometry, value?.idu]);

  const helper = problem
    || (isConfirmed ? "Change the selection to search again." : message)
    || "Search by cadastral reference, or zoom in and click a parcel on the map.";

  return (
    <div className={`ogcr-parcel-picker${problem || error ? " ogcr-input--error" : ""}`}>
      <span className="ogcr-input__label">
        Parcel
        <span className="text-negative" aria-hidden="true"> *</span>
      </span>

      <form className="ogcr-parcel-picker__filters" onSubmit={handleSubmit}>
        <TextField
          label="Code INSEE"
          placeholder="e.g., 59350"
          value={fields.code_insee}
          disabled={locked}
          onChange={handleFieldChange("code_insee")}
        />
        <TextField
          label="Section"
          placeholder="e.g., AB"
          value={fields.section}
          disabled={locked}
          onChange={handleFieldChange("section")}
        />
        <TextField
          label="Numéro"
          placeholder="e.g., 1"
          value={fields.numero}
          disabled={locked}
          onChange={handleFieldChange("numero")}
        />
        <div className="ogcr-parcel-picker__filters-actions">
          <Button
            type="submit"
            tone="brand"
            disabled={locked || searching || !fields.code_insee.trim()}
            startIcon={searching
              ? <Loader variant="spinner" size="s" label="Searching the cadastre" />
              : <MagnifyingGlassIcon size={16} weight="bold" />}
          >
            {searching ? "Searching…" : "Search"}
          </Button>
          <Button
            type="button"
            variant="outlined"
            disabled={locked || searching}
            startIcon={<BroomIcon size={16} weight="bold" />}
            onClick={handleClear}
          >
            Clear
          </Button>
        </div>
      </form>

      <div ref={mapElement} className="ogcr-map-shell ogcr-parcel-picker__map" />

      <p className="ogcr-input__helper">{error || helper}</p>

      {isConfirmed ? (
        <div className="ogcr-parcel-picker__summary">
          <div className="flex flex-row items-center gap-2">
            <CheckCircleIcon size={18} weight="fill" />
            <span className="ogcr-parcel-picker__summary-title">
              {value.label || value.idu || "Parcel selected"}
            </span>
          </div>
          <dl className="ogcr-parcel-picker__summary-details">
            <dt>Cadastral id</dt>
            <dd>{value.idu || "—"}</dd>
            <dt>Geometry</dt>
            <dd>{describeGeometry(value.geometry) || "—"}</dd>
          </dl>
          <Button variant="text" disabled={disabled} onClick={handleChangeSelection}>
            Change selection
          </Button>
        </div>
      ) : Boolean(selected) && (
        <div className="ogcr-parcel-picker__actions">
          <Button
            variant="filled"
            tone="brand"
            disabled={disabled}
            startIcon={<CheckCircleIcon size={16} weight="bold" />}
            onClick={handleConfirm}
          >
            Confirm selection
          </Button>
          <span className="ogcr-input__helper">{parcelLabel(selected)}</span>
        </div>
      )}
    </div>
  );
}

export default ParcelCadastrePicker;
