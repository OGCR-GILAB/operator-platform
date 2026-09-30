import axios from "axios";

// The French cadastre, via IGN's APICarto.
// https://apicarto.ign.fr/api/doc/cadastre#/Parcelle/getParcelle
//
// Deliberately uses the bare `axios`, not the instance from `$api`: the
// DirectLogin token is attached by an interceptor registered on that instance,
// and it has no business reaching IGN.

const APICARTO_PARCELLE_URL = "https://apicarto.ign.fr/api/cadastre/parcelle";

// APICarto matches the stored strings exactly, so both are zero-padded.
// Section is always two characters ("AB", "0B", "C" -> "0C"), numero always four.
const padSection = (value) => String(value || "").trim().toUpperCase().padStart(2, "0");
const padNumero = (value) => String(value || "").trim().padStart(4, "0");

// Parcels outside an absorbed commune, which is the ordinary case.
const DEFAULT_PREFIXE = "000";

/**
 * The full 14-character cadastral id: code_insee + prefixe + section + numero.
 *
 * APICarto hands back the real one as `idu`, and that wins — a commune that
 * absorbed another carries its prefixe there (Lille's is `298`, not `000`), so
 * composing one would not match the cadastre. The composition is the fallback
 * for features that arrive without an `idu`.
 */
export function parcelId(properties = {}) {
  if (properties.idu) return properties.idu;

  const commune = String(properties.code_insee || "").trim().toUpperCase();
  if (!commune) return "";

  const prefixe = String(properties.prefixe || DEFAULT_PREFIXE).trim().padStart(3, "0");

  return `${commune}${prefixe}${padSection(properties.section)}${padNumero(properties.numero)}`;
}

/** `"59350298AB0006 · Lille"` — one line an operator can recognise. */
export function parcelLabel(feature) {
  const properties = feature?.properties || {};

  return [parcelId(properties), properties.nom_com].filter(Boolean).join(" · ");
}

class $cadastre {
  /**
   * Look up parcels by cadastral reference. `code_insee` is mandatory —
   * APICarto refuses a query with neither a commune nor a geometry. Section and
   * numero narrow it down; without them the whole commune comes back.
   */
  async parcelle({ code_insee, section, numero } = {}) {
    const commune = String(code_insee || "").trim().toUpperCase();

    if (!commune) {
      throw new Error("An INSEE code is required to search the cadastre.");
    }

    const params = { code_insee: commune, _limit: 500 };

    if (String(section || "").trim()) params.section = padSection(section);
    if (String(numero || "").trim()) params.numero = padNumero(numero);

    const { data } = await axios.get(APICARTO_PARCELLE_URL, { params });

    return data;
  }
}

export default new $cadastre();
