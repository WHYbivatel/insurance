/** Host shown beside an external link, without a redundant www prefix. */
export function externalHost(value: string): string {
  return new URL(value).host.replace(/^www\./, '');
}
