# C/C++ Comment Fold Helper (VS Code Extension)

Smart C/C++ comment fold preview engine tailored for Embedded Systems and C/C++.

---

## Features

- **Inline Brief Fold Previews (Zero-Gap Folding)**:
  When folding any multi-line C/C++ comment or Doxygen banner, an inline preview of the brief title is automatically displayed next to the fold indicator (`...`) with **zero blank line gaps**:

  ```c
  /** @req{gpt_clear_external_source,SWFLEX-9,R_GPT_Open} The GPT shall clearing the timer with external sources. */
  TEST(R_GPT_TG1, TC_ClearExternalSource)
  ```

- **100% View-Only (Safe Saving)**:
  Does not modify buffer content when folding. File on disk and `git diff` remain 100% untouched.

- **Full Comment Boundary Folding**:
  Standard VS Code C/C++ folding often leaves the closing `*/` unfolded, creating an unwanted empty line gap. This extension provides complete block comment folding range (including `*/`), code blocks (`{ ... }`), and preprocessors (`#if ... #endif`).

- **Dual-token Header Support**:
  Native support for `/*****...*//**` opening headers.

- **Rule Brief Extraction**:
  Automatically extracts `@brief`, requirement tags (`@req{...}`, `@verify{...}`), or the first meaningful content line, skipping decorative borders.

- **Manual 1-Line Compact Banner Toggle** (<kbd>Alt+C</kbd> / <kbd>Ctrl+K, Ctrl+B</kbd>):
  Optionally convert comment blocks to a 1-line compact banner with full width and cache restoration.

---

## Configuration

To ensure VS Code always uses complete zero-gap comment folding instead of leaving `*/` on a visible line, this extension contributes default folding provider settings. You can also explicitly verify or add this to your VS Code `settings.json`:

```json
{
  "[c]": {
    "editor.defaultFoldingRangeProvider": "ngxx-fus.c-comment-fold-helper"
  },
  "[cpp]": {
    "editor.defaultFoldingRangeProvider": "ngxx-fus.c-comment-fold-helper"
  },
  "[cuda-cpp]": {
    "editor.defaultFoldingRangeProvider": "ngxx-fus.c-comment-fold-helper"
  }
}
```

---

## Installation

```bash
code --install-extension c-comment-fold-helper-0.1.4.vsix
```

Or in VS Code:

1. Open Extensions (<kbd>Ctrl+Shift+X</kbd>).
2. Click `...` (Views and More Actions) in the top-right corner.
3. Select **Install from VSIX...** and pick `c-comment-fold-helper-0.1.4.vsix`.

---

## Development & Building

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.x or later recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Visual Studio Code](https://code.visualstudio.com/)

### Environment Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/ngxx-fus/vscode-c-comment-helper.git
   cd vscode-c-comment-helper
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

### Building the Project

- **Compile TypeScript**:

  ```bash
  npm run compile
  ```

  Compiles TypeScript sources from `src/` into JavaScript under `out/`.

- **Watch mode** (incremental compile during development):

  ```bash
  npm run watch
  ```

### Running & Debugging

1. Open this repository folder in VS Code:

   ```bash
   code .
   ```

2. Press <kbd>F5</kbd> (or go to **Run** &rarr; **Start Debugging**).
3. A new **Extension Development Host** window will appear with this extension loaded.
4. Open any `.c`, `.cpp`, or `.h` file to test fold previews or test the compact banner toggle shortcut (<kbd>Alt+C</kbd> / <kbd>Ctrl+K, Ctrl+B</kbd>).

### Packaging `.vsix`

To package the extension into a distributable `.vsix` file:

```bash
npm run package
```

This runs `@vscode/vsce package` and outputs `c-comment-fold-helper-<version>.vsix` in the project root directory.

## Commit format


### Windows

```pwsh
git commit -m "C-CMT-HELPER | $(Get-Date -Format 'MM-dd-yyyy HH:mm:ss') | UPDATE/FIX/FEATURE | <msg>"
```

### Linux

```shell
git commit -m "C-CMT-HELPER | $(date +"%D %T") | UPDATE/FIX/FEATURE | <msg>"
```
