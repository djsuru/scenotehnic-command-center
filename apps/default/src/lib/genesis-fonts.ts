/**
 * Declares the template's web fonts, so a font change is a token change only.
 *
 * Each import adds the `@font-face` rules of one variable family. A browser
 * downloads a family only when a rendered element uses it, so the app keeps
 * the system stack and loads no font file until `src/index.css` names a
 * family in `--font-sans`, `--font-display` or `--font-mono`. The family names
 * and the use of each one are in `docs/02_theming.md`.
 *
 * These are the only font packages in the template. An import of any other
 * font package loads nothing or fails the build. The explicit `/index.css`
 * lets the builder drop an import whose package is missing (an older builder
 * image) instead of failing the app. The app then renders the fallback stack.
 */
import '@fontsource-variable/fraunces/index.css';
import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/inter/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import '@fontsource-variable/nunito/index.css';
import '@fontsource-variable/space-grotesk/index.css';
