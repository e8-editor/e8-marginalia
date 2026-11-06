;;; annotations.el --- Record marginalia's annotations, for marginalia-tests.ts  -*- lexical-binding: t -*-

;; Copyright (C) 2026 The E8 contributors
;; SPDX-License-Identifier: GPL-3.0-or-later

;; From the repository's top directory:
;;
;;   emacs -Q --batch -l test/annotations.el
;;
;; marginalia loads from E8_ELPA, else ~/.emacs.d/elpaca/repos, in a
;; directory named marginalia.  Annotates a command, a variable, a face, a
;; buffer and a file that marginalia-tests.ts makes the same, with
;; marginalia-field-width 40, and writes the annotations, without their
;; properties, into annotations.json.

(require 'json)
(defvar an-elpa (file-name-as-directory (or (getenv "E8_ELPA") (expand-file-name "~/.emacs.d/elpaca/repos"))))
(add-to-list 'load-path (expand-file-name "marginalia" an-elpa))
(require 'marginalia)
(defvar an-dir (file-name-directory (or load-file-name buffer-file-name)))

(defun an-test-command () "Run the test thing.\n\nMore about it." (interactive))
(global-set-key (kbd "C-c t") #'an-test-command)
(defun an-unbound-command () "Do nothing much, for a test that has a very long first line that goes on." (interactive))
(defvar an-test-variable 42 "The answer, for the test.")
(defvar an-test-string "hello" "A string, for the test.")
(defvar an-test-list '(1 2 3) "A list.")
(defvar an-api-key "secret" "Not to be shown.")
(defface an-test-face '((t :weight bold)) "A face for the test.")
(make-directory "/tmp/e8-marginalia" t)
(with-temp-file "/tmp/e8-marginalia/notes.txt" (insert "hello"))
(set-file-times "/tmp/e8-marginalia/notes.txt" (encode-time 0 4 3 2 1 2020))
(with-current-buffer (find-file-noselect "/tmp/e8-marginalia/notes.txt") (fundamental-mode))

(let ((marginalia-field-width 40)
      (out nil))
  (dolist (c `((command "an-test-command") (command "an-unbound-command")
               (variable "an-test-variable") (variable "an-test-string") (variable "an-test-list") (variable "an-api-key")
               (face "an-test-face")
               (buffer "notes.txt")
               (file "/tmp/e8-marginalia/notes.txt")))
    (let* ((fn (intern (format "marginalia-annotate-%s" (car c))))
           (ann (funcall fn (cadr c))))
      (push `((category . ,(symbol-name (car c))) (candidate . ,(cadr c)) (annotation . ,(and ann (substring-no-properties ann)))) out)))
  (with-temp-file (expand-file-name "annotations.json" an-dir)
    (insert (json-encode (vconcat (nreverse out))))
    (json-pretty-print-buffer)))
