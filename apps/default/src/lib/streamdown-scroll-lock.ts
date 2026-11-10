/**
 * Makes the Streamdown scroll lock hold when an app clips `<html>`.
 *
 * Streamdown locks the page with `document.body.style.overflow = "hidden"`
 * while its link-safety modal, fullscreen table or fullscreen diagram is open.
 * The body value locks the page only while `<html>` has `overflow: visible`,
 * because the browser then moves the body value to the viewport. An app rule
 * that clips `<html>` (for example `html, body { overflow-x: clip; }`, a
 * common fix for sideways scroll) keeps the value on the body, so the page
 * behind the modal still scrolls.
 *
 * This copies the body lock to `<html>` while it is set, and removes the copy
 * when the body lock ends. It does not touch an inline `<html>` overflow that
 * the app set itself. A CSS `:has()` rule cannot do this: Safari does not
 * re-match `html:has(> body[style])` when the body style changes.
 */

const watched = new WeakSet<Document>();

export function mirrorBodyScrollLockToRoot(doc: Document): void {
  const body = doc.body;
  if (body == null || watched.has(doc) || typeof MutationObserver === 'undefined') {
    return;
  }
  watched.add(doc);

  const root = doc.documentElement;
  let copied = false;
  // Only an `<html>` that is not `visible` keeps the body lock off the
  // viewport. Copying it otherwise makes the body a scroll container and
  // unsticks every `position: sticky` header while the modal is open.
  const rootClips = () => {
    const style = doc.defaultView?.getComputedStyle(root);
    // '' is jsdom's value for an unset property, `visible` a browser's.
    const clips = (value: string) => value !== '' && value !== 'visible';
    return style != null && (clips(style.overflowX) || clips(style.overflowY));
  };
  const sync = () => {
    const locked = body.style.overflow === 'hidden';
    if (
      locked &&
      !copied &&
      root.style.overflowX === '' &&
      root.style.overflowY === '' &&
      rootClips()
    ) {
      root.style.overflow = 'hidden';
      copied = true;
    } else if (!locked && copied) {
      if (root.style.overflow === 'hidden') {
        root.style.overflow = '';
      }
      copied = false;
    }
  };

  new MutationObserver(sync).observe(body, {
    attributes: true,
    attributeFilter: ['style'],
  });
  sync();
}
