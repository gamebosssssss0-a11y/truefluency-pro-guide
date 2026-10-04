export function isPathSegment(value: string) {
  return value.length > 0 && value !== "." && value !== ".." && !/[\\/]/.test(value);
}

export function isOwnedMaterialPath(path: string, userId: string) {
  const parts = path.split("/");
  return parts.length === 3 && parts[0] === userId && parts.every(isPathSegment);
}
