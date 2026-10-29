export function formatGraphDescription(value: string): string {
  return value.replace(/<SEP>/g, '\n')
}
