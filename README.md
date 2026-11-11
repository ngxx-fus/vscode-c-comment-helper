# C/C++ Comment Fold Helper (VS Code Extension)

Smart C/C++ comment fold preview engine tailored for Embedded Systems and C/C++.

---

## Features

- **Inline Brief Fold Previews**:
  When folding any multi-line C/C++ comment or Doxygen banner, an inline preview of the brief title is automatically displayed next to the fold indicator (`...`):
  ```c
  /*************************************************//** [...] /* Sets duty cycle on requested pin... */
  int timer_set_duty_cycle(uint32_t channel, uint32_t duty)
  ```
- **100% View-Only (Safe Saving)**:
  Does not modify buffer content when folding. File on disk and `git diff` remain 100% untouched.
- **Dual-token Header Support**:
  Native support for `/*****...*//**` opening headers.
- **Rule Brief Extraction**:
  Automatically extracts `@brief` or the first meaningful content line, skipping decorative borders.
- **Manual 1-Line Compact Banner Toggle** (<kbd>Alt+C</kbd> / <kbd>Ctrl+K, Ctrl+B</kbd>):
  Optionally convert comment blocks to a 1-line compact banner with full width and cache restoration.

---

## Installation

```bash
code --install-extension c-comment-fold-helper-0.1.0.vsix
```
Or in VS Code:
1. Open Extensions (<kbd>Ctrl+Shift+X</kbd>).
2. Click `...` (Views and More Actions) in the top-right corner.
3. Select **Install from VSIX...** and pick `c-comment-fold-helper-0.1.0.vsix`.
