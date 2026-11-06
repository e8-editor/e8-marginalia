# e8-marginalia

Annotations beside completion candidates, for [E8](https://github.com/e8-editor/e8): with `marginalia-mode` on, the candidates of a prompt get notes in the margin by what they are: a command's key and documentation, a variable's value, a face's sample, a buffer's state and file, a file's modes, size and age. A port of [marginalia](https://github.com/minad/marginalia) 2.3.

## Installing

In `~/.config/e8/init.ts`:

```ts
e8.usePackage("e8-editor/e8-marginalia");
e8.call("marginalia-mode");
e8.defineKey("minibuffer-local-map", "M-A", "marginalia-cycle");
```

E8 installs it at its newest version tag into `repos/` beside `init.ts`, records the commit in `e8-lock.json`, and requires it. `M-x package-vc-upgrade` brings it up to date. Pin a version with `{ rev: "v0.1.0" }`. It needs E8 0.3.1 or newer.

The annotations show where a prompt lists its candidates as you type, as [e8-vertico](https://github.com/e8-editor/e8-vertico) does.

## Using it

The annotators know these categories of candidate: commands (their key and the first line of their documentation), variables (their value, censored for names like `api-key`, and documentation), functions, faces (a sample), minor modes (on or off, and their documentation), symbols, bookmarks, files and project files (modes, size, age and, when it is not yours, owner and group), buffers and project buffers (their state and file), themes and tabs.

`M-x marginalia-cycle`, on `M-A` above, switches the open prompt's category to its next annotator in `marginalia-annotators`: for commands, from the full annotation to only the key, to the table's own annotation, to none.

Variables:

- `marginalia-annotators`: each category's annotators, in the order `marginalia-cycle` goes through them.
- `marginalia-field-width`: the most columns a field takes, 80, and never more than half the minibuffer's width.
- `marginalia-separator`: what goes between fields.
- `marginalia-align`, `marginalia-align-offset`: whether the annotations line up on the left, in the centre or on the right.
- `marginalia-max-relative-age`: how old a file can be and still be shown as "3 hours ago" rather than a date.
- `marginalia-censor-variables`: the regexps of variable names whose values are not shown.
- `marginalia-prompt-categories`, `marginalia-command-categories`: the category of a prompt that does not say, by its text or by the command that opened it.

Each field has a face, from `marginalia-key` and `marginalia-documentation` to `marginalia-file-priv-read`.

## Differences from marginalia.el

- Annotations are lined up with spaces rather than Emacs's display spaces, so a face's sample is not centred.
- A symbol's class knows commands, functions, variables, buffer-local variables and faces, but not Emacs's custom, obsolete or advised ones.
- There is no annotator for packages, libraries, colours, charsets, coding systems or input methods, though `marginalia-prompt-categories` still names those categories.

## Credit

This is a port to E8 of [marginalia](https://github.com/minad/marginalia) 2.3, by Omar Antolín Camarena and Daniel Mendler, copyright the Free Software Foundation, and distributed in GNU ELPA, under the GNU General Public License version 3 or later. It is not the upstream authors' work as published, and they do not endorse it: report problems with the port here, not upstream.

## Developing

With an E8 on your PATH (a [release](https://github.com/e8-editor/e8/releases), or built from source) and TypeScript 5.8 or newer:

```bash
make test
make types
```

The tests need [e8-vertico](https://github.com/e8-editor/e8-vertico), which `make` clones into `.e8/deps`. The tests in `test/marginalia-tests.ts` check that the annotators give what marginalia.el 2.3 gives in Emacs 30 for the same command, variables, face, buffer and file, recorded in `test/annotations.json`, and that vertico shows the annotations lined up beside the candidates, cut to the minibuffer's width. `test/annotations.el` records the annotations again:

```bash
emacs -Q --batch -l test/annotations.el
```

It loads marginalia from `~/.emacs.d/elpaca/repos/marginalia`, or from the directory `E8_ELPA` names, and makes its file in `/tmp/e8-marginalia`, as the tests do.

## Licence

GPL-3.0-or-later: see `LICENSE`.
