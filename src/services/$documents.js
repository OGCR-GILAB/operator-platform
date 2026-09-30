import api, { fetchAllPages } from "./$api";

export const DOCUMENT_KINDS = [
  'ownership_proof',
  'land_use_agreement',
  'cadastral_extract',
  'methodology',
  'monitoring_report',
  'photo',
  'map',
  'other',
];

// Fallbacks only — read the real values from `GET reference/`
// (document_max_size_mb, document_allowed_extensions).
export const DEFAULT_MAX_SIZE_MB = 25;
export const DEFAULT_ALLOWED_EXTENSIONS = [
  'csv', 'doc', 'docx', 'geojson', 'gpkg', 'jpeg', 'jpg', 'json',
  'kml', 'pdf', 'png', 'tif', 'tiff', 'txt', 'xls', 'xlsx', 'zip',
];

function buildFormData({ file, kind, title, description, project, parcel }) {
  const form = new FormData();

  form.append('file', file);
  if (kind) form.append('kind', kind);
  if (title) form.append('title', title);
  if (description) form.append('description', description);
  // Exactly one of the two.
  if (project != null) form.append('project', project);
  else if (parcel != null) form.append('parcel', parcel);

  return form;
}

class $documents {
  /** Filters: project, parcel, operator, kind, forward_status, all_versions. */
  async list(params) {
    const { data } = await api.get('/documents/', { params });
    return data;
  }

  async listAll(params) {
    return fetchAllPages('/documents/', params);
  }

  async get(documentId) {
    const { data } = await api.get(`/documents/${documentId}/`);
    return data;
  }

  /** multipart/form-data: file, kind, title and exactly one of project / parcel. */
  async upload(model, { onUploadProgress } = {}) {
    const { data } = await api.post('/documents/', buildFormData(model), {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return data;
  }

  /** Metadata only — the file itself is replaced with `addVersion()`. */
  async patch(documentId, model) {
    const { data } = await api.patch(`/documents/${documentId}/`, model);
    return data;
  }

  async remove(documentId) {
    const { data } = await api.delete(`/documents/${documentId}/`);
    return data;
  }

  /** The previous version is superseded but kept. */
  async addVersion(documentId, file, { onUploadProgress } = {}) {
    const form = new FormData();
    form.append('file', file);

    const { data } = await api.post(`/documents/${documentId}/versions/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return data;
  }

  /**
   * Files are private: the download endpoint is the only way to fetch one and it
   * needs the auth header, so never put the URL in an <a href> or <img src>.
   */
  async download(documentId) {
    const response = await api.get(`/documents/${documentId}/download/`, {
      responseType: 'blob',
    });

    return {
      blob: response.data,
      filename: filenameFromDisposition(response.headers?.['content-disposition']),
      contentType: response.headers?.['content-type'] || response.data?.type,
    };
  }

  /**
   * Object URL for previewing an image or a PDF inline. The caller owns it and
   * must call `URL.revokeObjectURL` when the view unmounts.
   */
  async objectUrl(documentId) {
    const { blob } = await this.download(documentId);
    return URL.createObjectURL(blob);
  }

  /** Fetch as a blob and hand it to the browser as a save. */
  async saveToDisk(documentId, fallbackName = 'document') {
    const { blob, filename } = await this.download(documentId);
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename || fallbackName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  /**
   * Client-side pre-flight so the user is not made to wait for a 25 MB upload
   * only to be rejected. Pass the limits from `GET reference/`.
   */
  validate(file, {
    maxSizeMb = DEFAULT_MAX_SIZE_MB,
    allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
  } = {}) {
    if (!file) return 'Choose a file to upload.';

    const extension = String(file.name || '').split('.').pop()?.toLowerCase();

    if (!extension || !allowedExtensions.includes(extension)) {
      return `That file type is not accepted. Allowed: ${allowedExtensions.join(', ')}.`;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      return `The file is larger than the ${maxSizeMb} MB limit.`;
    }

    return null;
  }
}

function filenameFromDisposition(disposition) {
  if (!disposition) return null;

  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8) return decodeURIComponent(utf8[1]);

  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1] : null;
}

export default new $documents();
