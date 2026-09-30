/**
 * Colour keys for the monitoring layers in `mapLayers.js`.
 *
 * A classified raster is unreadable without one — the CORINE layer alone paints
 * 44 different colours over somebody's land. These live apart from the layer
 * definitions only because of their bulk; a layer references its key with
 * `legend:` and the drawer renders whatever it finds there.
 *
 * Shape: either `items` for a flat key, or `groups` for one broken into
 * headings. `note` is the sentence under the heading, for anything the swatches
 * cannot say on their own.
 *
 * The CORINE values below are not transcribed from the specification — they
 * were read back out of the service's own `MapServer/legend` response, so a
 * swatch here is the colour that endpoint actually paints.
 */

/** CORINE Land Cover 2018, grouped by the classification's own first level. */
export const CLC_LEGEND = {
  note: 'Europe only. Classes follow the CORINE nomenclature.',
  groups: [
    {
      label: 'Artificial surfaces',
      items: [
        { color: '#E6004D', label: 'Continuous urban fabric' },
        { color: '#FF0000', label: 'Discontinuous urban fabric' },
        { color: '#CC4DF2', label: 'Industrial or commercial units' },
        { color: '#CC0000', label: 'Road and rail networks' },
        { color: '#E6CCCC', label: 'Port areas' },
        { color: '#E6CCE6', label: 'Airports' },
        { color: '#A600CC', label: 'Mineral extraction sites' },
        { color: '#A64D00', label: 'Dump sites' },
        { color: '#FF4DFF', label: 'Construction sites' },
        { color: '#FFA6FF', label: 'Green urban areas' },
        { color: '#FFE6FF', label: 'Sport and leisure facilities' },
      ],
    },
    {
      label: 'Agricultural areas',
      items: [
        { color: '#FFFFA8', label: 'Non-irrigated arable land' },
        { color: '#FFFF00', label: 'Permanently irrigated land' },
        { color: '#E6E600', label: 'Rice fields' },
        { color: '#E68000', label: 'Vineyards' },
        { color: '#F2A64D', label: 'Fruit trees and berry plantations' },
        { color: '#E6A600', label: 'Olive groves' },
        { color: '#E6E64D', label: 'Pastures' },
        { color: '#FFE6A6', label: 'Annual crops with permanent crops' },
        { color: '#FFE64D', label: 'Complex cultivation patterns' },
        { color: '#E6CC4D', label: 'Agriculture with natural vegetation' },
        { color: '#F2CCA6', label: 'Agro-forestry areas' },
      ],
    },
    {
      label: 'Forest and semi-natural',
      items: [
        { color: '#80FF00', label: 'Broad-leaved forest' },
        { color: '#00A600', label: 'Coniferous forest' },
        { color: '#4DFF00', label: 'Mixed forest' },
        { color: '#CCF24D', label: 'Natural grasslands' },
        { color: '#A6FF80', label: 'Moors and heathland' },
        { color: '#A6E64D', label: 'Sclerophyllous vegetation' },
        { color: '#A6F200', label: 'Transitional woodland-shrub' },
        { color: '#E6E6E6', label: 'Beaches, dunes, sands' },
        { color: '#CCCCCC', label: 'Bare rocks' },
        { color: '#CCFFCC', label: 'Sparsely vegetated areas' },
        { color: '#000000', label: 'Burnt areas' },
        { color: '#A6E6CC', label: 'Glaciers and perpetual snow' },
      ],
    },
    {
      label: 'Wetlands',
      items: [
        { color: '#A6A6FF', label: 'Inland marshes' },
        { color: '#6E6E6E', label: 'Peat bogs' },
        { color: '#CCCCFF', label: 'Salt marshes' },
        { color: '#E6E6FF', label: 'Salines' },
        { color: '#A6A6E6', label: 'Intertidal flats' },
      ],
    },
    {
      label: 'Water bodies',
      items: [
        { color: '#00CCF2', label: 'Water courses' },
        { color: '#80F2E6', label: 'Water bodies' },
        { color: '#00FFA6', label: 'Coastal lagoons' },
        { color: '#A6FFE6', label: 'Estuaries' },
        { color: '#E6F2FF', label: 'Sea and ocean' },
      ],
    },
  ],
};

/**
 * Hansen tree cover loss. The pyramid paints a single red, and varies its alpha
 * with how much of the pixel was lost — so the key is one colour and a sentence
 * explaining that a deeper red is more loss, not a different category.
 */
export const TREE_COVER_LOSS_LEGEND = {
  note: 'Deeper red marks a greater share of the area lost. Forest extent itself is not shown.',
  items: [
    { color: '#FF0000', label: 'Tree cover loss' },
  ],
};

/**
 * The Operator's own parcels, coloured by DCR state.
 *
 * These three are the fill colours in `$map.setOperatorParcels()` and have to
 * stay in step with them — the key is only true because the numbers match.
 */
export const PARCEL_LEGEND = {
  items: [
    { color: '#2e7d5b', label: 'Synced with DCR' },
    { color: '#c98a2e', label: 'Local only' },
    { color: '#b4453c', label: 'Sync failed' },
  ],
};
