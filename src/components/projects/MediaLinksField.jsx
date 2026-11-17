import { PlusIcon, XIcon } from "@phosphor-icons/react";
import { Button, FormFieldset, Input, Select } from "@majistudio/ogcr-design-system";

// DCR files a link with no type as `link`, so that is what an empty choice means.
const MEDIA_TYPE_OPTIONS = [
  { value: "article", label: "Article" },
  { value: "video", label: "Video" },
  { value: "photo", label: "Photo" },
  { value: "link", label: "Link" },
];

/**
 * The activity's media links, one row each. Title and type are optional: DCR
 * otherwise gets type `link` and the URL as title. Rows are `{link, title,
 * type, ...}`; details without an input here (author, image, …) ride along.
 */
function MediaLinksField({ value, onChange, disabled = false }) {
  const rows = Array.isArray(value) ? value : [];

  const updateRow = (index, patch) => onChange(
    rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
  );

  return (
    <FormFieldset legend="Media links">
      {rows.map((row, index) => (
        // Rows have no id of their own and are only appended or removed.
        <div key={index} className="ogcr-media-links__row">
          <Input
            label="URL"
            type="url"
            placeholder="https://"
            value={row.link || ""}
            onChange={(event) => updateRow(index, { link: event.target.value })}
            disabled={disabled}
          />
          <Input
            label="Title"
            placeholder="Defaults to the URL"
            value={row.title || ""}
            onChange={(event) => updateRow(index, { title: event.target.value })}
            disabled={disabled}
          />
          <Select
            label="Type"
            placeholder="Link"
            options={MEDIA_TYPE_OPTIONS}
            value={row.type || null}
            onValueChange={(value) => updateRow(index, { type: value })}
            disabled={disabled}
          />
          <Button
            iconOnly
            variant="text"
            className="ogcr-media-links__remove"
            aria-label={`Remove media link ${index + 1}`}
            iconLeft={<XIcon size={16} />}
            disabled={disabled}
            onClick={() => onChange(rows.filter((_, rowIndex) => rowIndex !== index))}
          />
        </div>
      ))}
      <div>
        <Button
          variant="outlined"
          iconLeft={<PlusIcon size={16} />}
          disabled={disabled}
          onClick={() => onChange([...rows, { link: "", title: "", type: "" }])}
        >
          Add media link
        </Button>
      </div>
    </FormFieldset>
  );
}

export default MediaLinksField;
