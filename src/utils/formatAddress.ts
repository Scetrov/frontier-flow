/**
 * Truncates a Sui wallet address for compact header display.
 */
export function formatAddress(address: string): string {
  if (address.length < 10 || !address.startsWith("0x")) {
    return address;
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}