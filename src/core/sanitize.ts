export function secureFilename(filename: string): string {
  // Normalize unicode and strip non-ASCII characters to match Werkzeug secure_filename
  const normalized = filename
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '');

  // Convert path separators to spaces first to match Werkzeug path separator handling
  const withoutSeparators = normalized.replace(/[/\\]+/g, ' ');

  // Replace whitespace with underscores and remove any character that is not alphanumeric, underscore, dot or hyphen
  const cleaned = withoutSeparators
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '');

  // Strip leading and trailing dots and underscores
  const trimmed = cleaned.replace(/^[_.-]+|[_.-]+$/g, '');

  return trimmed;
}
