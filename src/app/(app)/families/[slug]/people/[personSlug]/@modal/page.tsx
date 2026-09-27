/**
 * Matches the profile URL itself, so a soft navigation back to it (panel
 * closed via router.back(), browser Back) clears the slot — without this a
 * parallel slot keeps showing its last page and the panel would stay open.
 */
export default function ModalClosed() {
  return null;
}
