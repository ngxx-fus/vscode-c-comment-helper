# Note While Fixing

Record of bugs, errors encountered, and resolutions applied.

---

## Fix 1: VSIX Installation Failed ("extension/package.json not found inside zip")

- **Title**: VSIX zip archive package directory prefix error
- **ErrorDesc**:
  When running `.\BuildVSIX.ps1 -Install`, VS Code installation failed with `Error: extension/package.json not found inside zip`.
  On Windows PowerShell, `$env:TEMP` returns an 8.3 DOS short path (e.g. `C:\Users\PHU~1.NGU\AppData\Local\Temp`), whereas `Get-ChildItem` produces full long path names (`C:\Users\phu.nguyen-thanh\...`). The relative path substring logic sliced the path at the wrong offset, prefixing entries inside the ZIP archive with trailing GUID characters (e.g. `22617a/extension/package.json`).
- **HowToFix**:
  1. Relocated the staging directory from `$env:TEMP` to `.vsix_stage` directly in the project root.
  2. Resolved the staging directory root using `(Get-Item $tempDir).FullName` to guarantee matched character indices.
  3. Added parameter support for both `-Install` and `--Install` CLI syntax.

---

## Fix 2: Unwanted Blank Line Gap Under Folded Comment Previews

- **Title**: Visual blank line gap artifact when folding comments
- **ErrorDesc**:
  When folding block comments `/** ... */`, default C/C++ language extensions (`cpptools`) fold only the body lines and leave the closing delimiter line (`*/`) unfolded. The extension's previous logic attempted to hide the closing `*/` using `createTextEditorDecorationType({ textDecoration: 'none; display: none;' })`. In the Monaco/VS Code DOM, hiding text characters does not collapse the line container's vertical height, causing the line to be rendered as an empty blank line gap between the comment preview and subsequent code.
- **HowToFix**:
  1. Implemented complete block comment folding range in `CommentFoldingRangeProvider`, encompassing lines from opening `/**` all the way through the closing `*/` line.
  2. Added folding range support for code blocks (`{ ... }`), preprocessors (`#if`, `#ifdef`, `#region` to `#endif`, `#endregion`), and consecutive single-line comments (`//`).
  3. Configured `configurationDefaults` in `package.json` to assign `editor.defaultFoldingRangeProvider` to `ngxx-fus.c-comment-fold-helper` for `c`, `cpp`, and `cuda-cpp`.
  4. Avoided hiding text on unfolded lines for standard comments (`width === 0`).

---

## Fix 3: Markdownlint MD031 Warning in README.md

- **Title**: Markdownlint rule MD031 / blanks-around-fences violation
- **ErrorDesc**:
  VS Code Markdownlint triggered warnings: `MD031/blanks-around-fences: Fenced code blocks should be surrounded by blank lines`. Code blocks inside lists and directly adjacent to section headers lacked required preceding and trailing empty lines.
- **HowToFix**:
  Surrounded every fenced code block (```` ``` ````) with an empty line before and after, keeping list item content properly indented.

---

## Fix 4: Doxygen / Requirement Tag Extraction & 100 Column Preview Cropping

- **Title**: Missing requirement tag extraction & line width overflow
- **ErrorDesc**:
  Comments opening with tags such as `@req{...}`, `@defgroup`, `@verify` were either partially stripped or exceeded editor view widths. Box banner previews also appended unnecessary trailing asterisks (`*****.../`).
- **HowToFix**:
  1. Updated `extractCommentTitle` to prioritize all Doxygen/requirement tags matching `@\w+` (e.g. `@req{...}`, `@defgroup`, `@brief`), extracting the full tag and description intact.
  2. Standardized `buildCompactBanner` to generate clean `/** <title> */` previews without asterisk fillers.
  3. Added automatic cropping: if the preview (including indentation, prefix, title, and suffix) exceeds 100 columns, the title is cleanly truncated with `...` to keep total length $\le$ 100 columns.
