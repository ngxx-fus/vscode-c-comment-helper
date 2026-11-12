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

---

## Fix 5: Body Section Tags (@snippet, @retval) Mistakenly Extracted Over Summary Line (Case 6)

- **Title**: Body section tags (@snippet, @retval) extracted instead of descriptive first-line summary
- **ErrorDesc**:
  When a comment started with a descriptive summary sentence without an explicit `@brief` tag (e.g. `Get timer information and store it in provided pointer p_info. Implements @ref timer_api_t::infoGet.`), but later contained body/section tags such as `@snippet` or `@retval`, the previous `@\w+` regex matched `@snippet` as the title instead of using the first content line summary.
- **HowToFix**:
  1. Restricted Priority 1 title tags specifically to header/brief tags: `@req`, `@defgroup`, `@brief`, and `@file`.
  2. In Priority 2 (first content line extraction), ignored body section tags (`@snippet`, `@retval`, `@return`, `@param`, `@see`, `@code`, `@note`, `@warning`, etc.) ensuring natural summary lines are correctly extracted as the preview title.

---

## Fix 6: Deeply Indented Comments & Column Cropping with Leading Whitespace (Case 7)

- **Title**: Deep indentation preservation & column cropping calculation for nested block comments
- **ErrorDesc**:
  When comments are heavily indented inside nested control flows (e.g., 12 spaces indentation `            /*`), long text lines can easily overflow the editor viewport if the maximum column calculation does not account for the indentation prefix. In addition, manual toggle cache restoration must match even when titles are truncated with `...`.
- **HowToFix**:
  1. Ensured `detectIndent` preserves the exact leading whitespace of the comment header line.
  2. Computed `currentLen = prefix.length + title.length + suffix.length` where `prefix` includes the indentation, guaranteeing the entire rendered line stays within $\le$ 100 columns.
  3. Added title prefix matching in `commentCache` lookup so manual toggle restoration (`Alt+C`) succeeds seamlessly even if the on-screen comment preview was truncated.

---

## Fix 7: Indentation Preservation & Start Column Handling (Case 8 & Indented Comments)

- **Title**: Collapsed indentation and alignment loss in fold previews on indented comments
- **ErrorDesc**:
  Previously, `updateFoldDecorations` hid the opening line starting from column 0 (`new vscode.Range(foldStartLine, 0, foldStartLine, headerText.length)`) and injected `after: { contentText: compactBanner }` where `compactBanner` included leading spaces. In Monaco's CSS styling, whitespace inside `::after` pseudo-elements gets collapsed to a single space or stripped. Furthermore, indent guides and whitespace for columns 0..startCol were concealed.
- **HowToFix**:
  1. Calculated `startCol = Math.max(0, headerLine.firstNonWhitespaceCharacterIndex)` to locate the precise starting position of `/*` / `/**` (e.g. column 4 for `    /**`).
  2. Left columns `0` to `startCol` completely untouched so Monaco renders native whitespace indentation and indent guides.
  3. Restricted the hiding range to `new vscode.Range(foldStartLine, startCol, foldStartLine, headerText.length)`.
  4. Attached `contentText: compactBanner` to `after` of the non-empty hidden range directly without leading spaces, capping length at `maxCols = Math.max(20, 100 - startCol)` so total rendered width stays $\le$ 100 columns.

---

## Fix 8: Dangling Closing Line (`*/`) and Missing Fold Decoration When Deployed

- **Title**: Dangling `*/` closing delimiter and conflicting decoration types on folded lines
- **ErrorDesc**:
  When deployed, if the editor uses an external folding provider (such as Microsoft `cpptools`), comments were folded with the closing `*/` line left outside the fold range (e.g. line 713 folded as `> /** ...` and line 717 displaying `*/`). Previously, `updateFoldDecorations` only checked for closing borders when `width > 0`, leaving standard comments (`width === 0`) with `*/` dangling. Additionally, using two conflicting decoration types (`hideDecorationType` covering column 0 and `bannerOverlayDecorationType` anchored to an empty range at column 0) caused Monaco to suppress the `::after` text in folded state.
- **HowToFix**:
  1. Unified the decoration model into `bannerFoldDecorationType` that applies `display: none;` on `[startCol, headerText.length]` while directly supplying `renderOptions.after` on that exact range, ensuring reliable Monaco rendering on folded lines.
  2. Generalized the closing delimiter concealment check for all folded comments when `foldEndLine < commentEndLine`.
  3. Added command `cCommentFoldHelper.setDefaultFoldingProvider` to allow users to enforce `ngxx-fus.c-comment-fold-helper` as their default folding range provider with a single click.
