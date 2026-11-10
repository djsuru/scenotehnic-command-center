# 05 - Preview vs published

The same source runs in two places. Do not branch on the environment.

|                | Preview (in the Taskade editor)                 | Published app                       |
| -------------- | ----------------------------------------------- | ----------------------------------- |
| Audience       | the builder                                     | end users                           |
| Error boundary | raw error and stack, sent to "Fix with AI"      | friendly copy only                  |
| Theme bridge   | live `TASKADE_THEME_UPDATE` updates             | the saved tokens in `index.css`     |
| Hot reload     | yes                                             | no                                  |

Both use relative `/api/taskade/*` gateway paths, `GenesisClient` on the same
origin, sign-in from `/_genesis/auth`, and `index.html` for every route. Never
write an absolute backend host.

## Errors

`main.tsx` wraps the app in `GenesisRoot`, so a render throw shows a friendly
fallback (and "Fix with AI" in the preview). Add no top-level error boundary of
your own. End users never see a raw error or a state enum.

## Publishing

- A custom domain (CNAME, automatic SSL) and a site password are owner
  settings, not code.
- There are no runtime environment variables. Ids (project, agent, flow) are
  literals in `src/`.
- Assets come from `src/`, an https URL, or `public/`.

## Static files: `public/`

Files in a top-level `public/` folder ship as they are at the site root
(`/robots.txt`, `/llms.txt`, `/.well-known/security.txt`). Give every file an
extension: outside `.well-known/`, a URL with no extension serves the app
shell. Your file wins over a template default, except `public/index.html`,
which the builder ignores. Typical files: `robots.txt` and `sitemap.xml`
overrides, `llms.txt`, domain-verification files, `ads.txt`, `.well-known/*`
and downloads. The `robots.txt` and `sitemap.xml` overrides apply on the app's
own Taskade address (`*.taskade.app` by default, or the `taskade.page` or
`taskade.cc` base the owner picked). A connected custom domain serves platform
copies of those two files.
