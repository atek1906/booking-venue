export function extractQrisUrl(rawResponse: unknown) {
  const response = rawResponse as { actions?: Array<{ name: string; url: string }> } | null;
  return response?.actions?.find((action) => action.name === "generate-qr-code")?.url;
}
