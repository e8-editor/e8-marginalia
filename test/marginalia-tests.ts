// SPDX-License-Identifier: GPL-3.0-or-later
//
// marginalia's tests, with ERT: its annotators give what marginalia.el 2.3
// gives in Emacs 30 for the same things, as test/annotations.el recorded
// them in test/annotations.json, and vertico shows them beside the
// candidates. `make test` runs them in e8 --batch, as CI does, with
// e8-vertico from .e8/deps.

import { ertDeftest, should, shouldEqual, shouldError } from "ert";
import "marginalia";
import "vertico";

/** One of test/annotations.json: what Emacs's marginalia gave for a candidate. */
interface Recorded {
  category: string;
  candidate: string;
  annotation: string | null;
}

/** The file the buffer and file annotators are tried on, as test/annotations.el makes it. */
const NOTES = "/tmp/e8-marginalia/notes.txt";

// The things annotated, the same as test/annotations.el defines.
e8.bindKey("C-c t", e8.defineCommand({ name: "an-test-command", doc: "Run the test thing.\n\nMore about it.", run: () => undefined }));
e8.defineCommand({ name: "an-unbound-command", doc: "Do nothing much, for a test that has a very long first line that goes on.", run: () => undefined });
e8.defineVariable({ name: "an-test-variable", value: 42, doc: "The answer, for the test." });
e8.defineVariable({ name: "an-test-string", value: "hello", doc: "A string, for the test." });
e8.defineVariable({ name: "an-test-list", value: [1, 2, 3], doc: "A list." });
e8.defineVariable({ name: "an-api-key", value: "secret", doc: "Not to be shown." });
e8.defineFace({ name: "an-test-face", doc: "A face for the test.", attributes: { weight: "bold" } });

/** This repository's directory: the one on load-path that holds marginalia.ts. */
function repoDir(): string {
  const path = e8.variable("load-path");
  const dirs = Array.isArray(path) ? path.map(String) : [];
  const dir = dirs.find((d) => e8.fileExists(e8.fileNameConcat(d, "marginalia.ts")));
  if (dir === undefined) throw new Error("marginalia.ts is not on load-path");
  return dir;
}

function text(v: e8.Value | undefined): string {
  if (typeof v === "string") return v;
  if (v !== null && typeof v === "object" && "string" in v && typeof v.string === "string") return v.string;
  return "";
}

/** The after-strings of the overlays at the end of the minibuffer, which is current: vertico's candidates. */
function candidates(): string {
  const end = e8.pointMax();
  return e8
    .overlaysIn(e8.pointMin(), end)
    .filter((o) => e8.overlayEnd(o) === end)
    .map((o) => ({ o, priority: Number(e8.overlayGet(o, "priority") ?? 0) }))
    .sort((a, b) => a.priority - b.priority || a.o - b.o)
    .map(({ o }) => text(e8.overlayGet(o, "after-string")))
    .join("");
}

/**
 * Types `keys`, which open a prompt and end with C-g, in one keyboard
 * macro, as a prompt left open when the keys run out would read from
 * stdin, and gives what `snapshot` saw in the minibuffer just before the
 * C-g.
 */
function atPrompt<T>(keys: string, snapshot: () => T): T {
  let seen: T | undefined;
  const hook = () => {
    // Each key's sees what the one before it left; the last, the C-g's, what the others did.
    if (e8.minibufferDepth() > 0) seen = snapshot();
  };
  e8.addHook("pre-command-hook", hook);
  try {
    shouldError(() => e8.executeKbdMacro(`${keys} C-g`), { type: "quit" });
  } finally {
    e8.removeHook("pre-command-hook", hook);
  }
  should(seen !== undefined, `a prompt was open after ${keys}`);
  return seen!;
}

/** Runs `body` with a command whose name is longer than most, documented as `doc`, defined. */
function withLongCommand(doc: string, body: () => void): void {
  const name = "an-command-whose-name-is-longer-than-most";
  e8.defineCommand({ name, doc, run: () => undefined });
  try {
    body();
  } finally {
    e8.fmakunbound(name);
  }
}

function modesOn(): void {
  for (const mode of ["vertico-mode", "marginalia-mode"]) {
    if (e8.variable(mode) !== true) e8.callWithPrefix(1, mode as e8.CommandName);
  }
}

/** Visits the notes file, made as test/annotations.el makes it, modified 2020-01-02. */
function visitNotes(): void {
  e8.makeDirectory(e8.fileNameDirectory(NOTES) ?? "/tmp/", { parents: true });
  e8.writeTextFile(NOTES, "hello", { mode: 0o644 });
  e8.setFileModes(NOTES, 0o644);
  e8.setFileTimes(NOTES, 1_577_930_640_000);
  e8.call("find-file", NOTES);
}

ertDeftest("marginalia-annotations-are-what-marginalia-gives-in-emacs", () => {
  const recorded = JSON.parse(e8.readTextFile(e8.fileNameConcat(repoDir(), "test", "annotations.json"))) as Recorded[];
  visitNotes();
  try {
    const failures: string[] = [];
    for (const r of recorded) {
      let e8Says = e8.letBind({ "marginalia-field-width": 40 }, () => {
        const a = e8.funcall(`marginalia-annotate-${r.category}`, r.candidate);
        return a === undefined || a === null ? null : text(a);
      });
      let emacsSays = r.annotation;
      if (r.category === "buffer") {
        // Emacs in batch formats no mode line, so its buffer status is empty: compare the file.
        const tail = (a: string | null) => (a === null ? null : Array.from(a).slice(-20).join(""));
        [e8Says, emacsSays] = [tail(e8Says), tail(emacsSays)];
      } else if (r.category === "file" && emacsSays !== null) {
        // Emacs was recorded as mark, on macOS; the file belongs to whoever
        // runs the test. marginalia shows the owner only when the file's
        // group is not the user's own: so on macOS, where /tmp's files are
        // wheel's, and not on Linux, where they are the user's.
        const attrs = e8.fileAttributes(NOTES);
        const owner = attrs?.group === "wheel" ? `  ${attrs.user}:wheel` : "";
        emacsSays = emacsSays.replace("  mark:wheel", owner);
      }
      if (e8Says !== emacsSays) failures.push(`${r.category} ${r.candidate}:\n  Emacs ${JSON.stringify(emacsSays)}\n  E8 ${JSON.stringify(e8Says)}`);
    }
    shouldEqual(failures.join("\n"), "");
  } finally {
    e8.call("kill-buffer", "notes.txt");
    e8.deleteDirectory(e8.fileNameDirectory(NOTES) ?? "/tmp/e8-marginalia/", { recursive: true });
  }
});

ertDeftest("marginalia-vertico-shows-annotations-aligned-beside-the-candidates", () => {
  modesOn();
  const after = atPrompt("M-x a n - t e s t - c", candidates);
  // The annotation starts at column 30, the candidate and its key rounded up to ten, then the separator.
  should(after.includes("an-test-command (C-c t)         Run the test thing."), after);
});

ertDeftest("marginalia-documentation-is-cut-to-half-the-minibuffer-width", () => {
  modesOn();
  // marginalia-field-width is the smaller of its 80 and half the
  // minibuffer's window, 40 in batch's 80 columns: the documentation, 74
  // columns, is cut there.
  shouldEqual(e8.windowSize(e8.minibufferWindow())?.width, 80);
  shouldEqual(e8.variable("marginalia-field-width"), 80);
  const after = atPrompt("M-x a n - u n b o u n d", candidates);
  should(after.includes("Do nothing much, for a test that has a …\n"), after);
});

ertDeftest("marginalia-each-minibuffer-aligns-its-annotations-afresh", () => {
  modesOn();
  withLongCommand("Long.", () => {
    const after = atPrompt("M-x a n - c o m m a n d", candidates);
    should(after.includes("an-command-whose-name-is-longer-than-most           Long."), after);
  });
  // The wider candidate the last minibuffer showed no longer pushes the annotations right.
  const after = atPrompt("C-h v a n - t e s t - v", candidates);
  should(after.includes("an-test-variable                 v       42"), after);
});

ertDeftest("marginalia-vertico-cuts-rows-at-the-window-edge-rather-than-continuing-them", () => {
  modesOn();
  const truncated = () => ({ truncate: e8.variable("truncate-lines") === true, after: candidates() });
  // The candidate and its annotation run past the 80 columns: vertico sets
  // truncate-lines, as Emacs's does, so the row is cut rather than continued.
  withLongCommand("Long, with documentation that goes past the edge.", () => {
    const { truncate, after } = atPrompt("M-x a n - c", truncated);
    const row = after.split("\n").find((line) => line.startsWith("an-command-whose-name-is-longer-than-most")) ?? "";
    should(e8.stringWidth(row) > 80, after);
    should(truncate, "truncate-lines is on");
  });
  // Input past four fifths of the width continues on the next line again.
  const long = atPrompt(`M-x ${Array<string>(78).fill("x").join(" ")}`, truncated);
  shouldEqual(long.truncate, false);
});
