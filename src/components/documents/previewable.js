const IMAGE_TYPES = ["image/png", "image/jpeg"];
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg"];

/**
 * What the viewer can show inline: "pdf", "image", or null for anything that
 * can only be downloaded. TIFF is left out on purpose — browsers cannot draw it.
 */
export function previewKindOf(doc) {
  const type = String(doc?.content_type || "").toLowerCase().split(";")[0].trim();

  if (type === "application/pdf") return "pdf";
  if (IMAGE_TYPES.includes(type)) return "image";

  // An upload without a reliable type falls back to its extension.
  const extension = String(doc?.original_name || "").split(".").pop()?.toLowerCase();

  if (extension === "pdf") return "pdf";
  if (IMAGE_EXTENSIONS.includes(extension)) return "image";

  return null;
}
