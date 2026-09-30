import { useCallback, useEffect, useRef, useState } from "react";
import { BroomIcon, FunnelSimpleIcon } from "@phosphor-icons/react";
import $map from "../../services/$map";
import Button from "../ui/Button";
import TextField from "../ui/TextField";
import Tooltip from "../ui/Tooltip";

const emptyFilterObject = {
  commune: undefined,
  prefixe: undefined,
  section: undefined,
  numero: undefined,
};

function ImportParcels() {
  const mapElement = useRef();

  const [filter, setFilter] = useState({
    ...emptyFilterObject,
  });

  const handleFilterChange = (key) => (event) => {
    const { value } = event.target;

    setFilter((current) => ({
      ...current,
      [key]: value || undefined,
    }));
  };

  const creatMapFilter = () => {
    const maplibreFilter = [
      "all",
    ];

    if (filter.commune !== undefined) {
      maplibreFilter.push(["in", filter.commune, ["get", "commune"]]);
    }

    if (filter.prefixe !== undefined) {
      maplibreFilter.push(["in", filter.prefixe, ["get", "prefixe"]]);
    }

    if (filter.section !== undefined) {
      maplibreFilter.push(["in", filter.section, ["get", "section"]]);
    }

    if (filter.numero !== undefined) {
      maplibreFilter.push(["in", filter.numero, ["get", "numero"]]);
    }

    if (maplibreFilter.length === 1) {
      return null;
    }

    return maplibreFilter;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const expression = creatMapFilter();

    $map.instance?.setFilter('parcels-nl', expression);

    $map.instance?.setFilter('parcels-nl_line', expression);

    try {
     let data = await $map.getFRParcels(filter);
      console.log(data)
    }
     catch(e) {
      console.log(e)
    }

  };

  const handleClearFilters = () => {
    setFilter({
      ...emptyFilterObject,
    });

    $map.instance.setFilter('parcels-nl', null);
    $map.instance.setFilter('parcels-nl_line', null);
  };

  const init = () => {
    // Importing means browsing the cadastre, so these reference layers are asked
    // for explicitly — the activity map does not carry them.
    $map.init({ element: mapElement.current, cadastre: true });
  };

  const updateMapHeight = useCallback(() => {
    if (!mapElement.current) {
      return;
    }

    const mapRect = mapElement.current.getBoundingClientRect();
    const footer = document.querySelector(".ogcr-footer");
    const footerHeight = footer?.offsetHeight || 0;
    const viewportHeight = window.innerHeight;
    const availableHeight = viewportHeight - mapRect.top - footerHeight - 24;
    const minHeight = Math.max(400, availableHeight);

    mapElement.current.style.minHeight = `${minHeight}px`;

    if ($map.instance?.resize) {
      $map.instance.resize();
    }
  }, []);


  useEffect(() => {
    updateMapHeight();

    const element = mapElement.current;
    init();

    const handleResize = () => {
      updateMapHeight();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      $map.destroy(element);
    };
  }, [updateMapHeight]);

  return (
    <>
      <form className="ogcr-import-parcels--filters" onSubmit={handleSubmit}>
        <TextField
          label="Commune (INSEE)"
          placeholder="Filter by INSEE code"
          value={filter.commune ?? ""}
          type="number"
          onChange={handleFilterChange("commune")}
        />
        <TextField
          label="Prefix"
          type="number"
          placeholder="Filter by prefix"
          value={filter.prefixe ?? ""}
          onChange={handleFilterChange("prefixe")}
        />
        <TextField
          label="Section"
          type="text"
          placeholder="Filter by section code"
          value={filter.section ?? ""}
          onChange={handleFilterChange("section")}
        />
        <TextField
          label="Numero"
          type="number"
          placeholder="Filter by number"
          value={filter.numero ?? ""}
          onChange={handleFilterChange("numero")}
        />
        <div className="ogcr-import-parcels--filters-actions">
          <Tooltip content="Apply filters" placement="top">
            <Button
              type="submit"
              tone="brand"
              className="ogcr-import-parcels__icon-button"
              ariaLabel="Apply filters"
            >
              <FunnelSimpleIcon size={18} weight="bold" />
            </Button>
          </Tooltip>
          <Tooltip content="Clear filters" placement="top">
            <Button
              type="button"
              variant="outlined"
              className="ogcr-import-parcels__icon-button"
              ariaLabel="Clear filters"
              onClick={handleClearFilters}
            >
              <BroomIcon size={18} weight="bold" />
            </Button>
          </Tooltip>
        </div>
      </form>
      <div ref={mapElement} className="ogcr-map-shell ogcr-card--floating">
      </div>

    </>
  );
}

export default ImportParcels;
