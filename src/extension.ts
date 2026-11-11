import * as vscode from 'vscode';

const DEFAULT_BANNER_WIDTH = 120;

// Persistent in-memory cache for restoring original multi-line comments
const commentCache = new Map<string, {
    text: string;
    width: number;
    indent: string;
    isDualToken: boolean;
    hasBrief: boolean;
}>();

// 1. Hide decoration: visually conceals the raw asterisks lines
const hideDecorationType = vscode.window.createTextEditorDecorationType({
    color: 'transparent',
    letterSpacing: '-1ch',
    textDecoration: 'none; display: none;',
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
});

// 2. Overlay banner decoration: displays the clean 1-line compact banner in place
const bannerOverlayDecorationType = vscode.window.createTextEditorDecorationType({
    after: {
        color: '#6A9955',
        fontStyle: 'italic',
    },
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen
});

export function cleanText(text: string): string {
    if (!text) {
        return '';
    }

    // Strip opening tokens: /*, /**, /*/, *, //, ///
    let cleaned = text.replace(/^\s*\/\*+\/?\s*/, '');
    cleaned = cleaned.replace(/^\s*\*+\/?\s*/, '');
    cleaned = cleaned.replace(/^\s*\/\/+\/?\s*/, '');

    // Strip closing tokens and dual-token delimiters: */, **/, //, *, ***, //**, *//**
    cleaned = cleaned.replace(/\/\/\*+\s*$/, '');
    cleaned = cleaned.replace(/\*\/\/\*\*.*$/, '');
    cleaned = cleaned.replace(/\s*\*+\/\s*$/, '');
    cleaned = cleaned.replace(/\s*\/\/+\s*$/, '');
    cleaned = cleaned.replace(/\s*\*+\s*$/, '');

    // Strip decorative borders from start and end: -, =, _, ~
    cleaned = cleaned.replace(/^\s*[-=_~]+\s*/, '');
    cleaned = cleaned.replace(/\s*[-=_~]+\s*$/, '');

    return cleaned.trim();
}

export function isBannerLine(text: string): boolean {
    if (!text || !text.trim()) {
        return true;
    }
    const cleaned = cleanText(text);
    if (!cleaned) {
        return true;
    }
    return !/\w/.test(cleaned);
}

export function isDualTokenHeader(line: string): boolean {
    const l = line.trim();
    return /\/\*+.*?\*\/\/\*\*/.test(l) || /\/\*+.*?\/\/\*\*/.test(l) || /\/\/\*+$/.test(l);
}

export function isCommentEnd(line: string): boolean {
    const l = line.trim();
    if (isDualTokenHeader(l) || l.endsWith('/**') || l.endsWith('/*') || /\/\/\*+$/.test(l)) {
        return false;
    }
    return /\*+\/\s*$/.test(l);
}

export function isCompactBanner(line: string): boolean {
    const l = line.trim();
    return /^\/\*+[ \t].*?\*{3,}\/$/.test(l) && !isDualTokenHeader(l);
}

export function extractCommentTitle(lines: string[]): string | null {
    if (!lines || lines.length === 0) {
        return null;
    }

    // Priority 1: Check for explicit @brief, \brief, brief: tag (must be at the start of a comment/line)
    for (const line of lines) {
        const m = /^\s*(?:\/\*+|\*+|\/\/+)?\s*[@\\]brief\s*:?\s*(.+)/i.exec(line) ||
                  /^\s*\*+\s*brief\s*:?\s*(.+)/i.exec(line) ||
                  /^\s*\/\/+\s*brief\s*:?\s*(.+)/i.exec(line);
        if (m) {
            const cleaned = cleanText(m[1]);
            if (cleaned && !isBannerLine(cleaned)) {
                return cleaned;
            }
        }
    }

    // Priority 2: First content line
    for (const line of lines) {
        const cleaned = cleanText(line);
        if (cleaned && !isBannerLine(cleaned)) {
            return cleaned;
        }
    }

    return null;
}

export function detectIndent(lines: string[]): string {
    for (const line of lines) {
        if (line.trim().length > 0) {
            const m = /^(\s*)/.exec(line);
            return m ? m[1] : '';
        }
    }
    return '';
}

export function detectBannerWidth(lines: string[]): number {
    // 1. Check for explicit banner border lines (e.g. /******... or *******.../ or //******)
    for (const l of lines) {
        const stripped = l.trim();
        if ((stripped.startsWith('/*') || stripped.startsWith('*') || stripped.startsWith('//')) && isBannerLine(stripped)) {
            const lineLen = l.trimEnd().length;
            if (lineLen >= 30) {
                return lineLen;
            }
        }
    }

    // 2. Check for single-line compact banner with trailing asterisks (e.g. /** ... ******/)
    for (const l of lines) {
        const trimmed = l.trimEnd();
        if (/\*{3,}\/$/.test(trimmed)) {
            return trimmed.length;
        }
    }

    // 3. Not a banner -> 0 width
    return 0;
}

export function buildCompactBanner(title: string, width = 0, indent = '', hasBrief = false): string {
    if (width > 0) {
        const prefix = `${indent}/** `;
        const titleDisplay = `${title} `;
        const used = prefix.length + titleDisplay.length + 2; // 2 for closing '*/'
        const fillLen = Math.max(3, width - used);
        const stars = '*'.repeat(fillLen);
        return `${prefix}${titleDisplay}${stars}*/`;
    }

    if (hasBrief) {
        return `${indent}/**  @brief ${title} */`;
    }
    return `${indent}/**  ${title} */`;
}

export function buildBoxBanner(title: string, width = 120, indent = '', isDualToken = true, hasBrief = false): string {
    const effWidth = Math.max(20, width - indent.length);
    if (isDualToken) {
        const top = `${indent}/` + '*'.repeat(effWidth - 8) + '//*****';
        const content = `${indent} * ${title}`;
        const bottom = `${indent}` + '*'.repeat(effWidth - 1) + '/';
        return `${top}\n${content}\n${bottom}`;
    }

    const top = `${indent}/` + '*'.repeat(effWidth - 1);
    const content = hasBrief ? `${indent} * @brief ${title}` : `${indent} * ${title}`;
    const bottom = `${indent}` + '*'.repeat(effWidth - 1) + '/';
    return `${top}\n${content}\n${bottom}`;
}

/**
 * Updates fold decorations across visible ranges in the active editor.
 * Conceals raw banner asterisks and overlays the compact single-line banner.
 */
function updateFoldDecorations(editor: vscode.TextEditor | undefined): void {
    if (!editor) {
        return;
    }

    const doc = editor.document;
    if (doc.languageId !== 'c' && doc.languageId !== 'cpp' && doc.languageId !== 'cuda-cpp') {
        editor.setDecorations(hideDecorationType, []);
        editor.setDecorations(bannerOverlayDecorationType, []);
        return;
    }

    const visibleRanges = editor.visibleRanges;
    if (!visibleRanges || visibleRanges.length === 0) {
        editor.setDecorations(hideDecorationType, []);
        editor.setDecorations(bannerOverlayDecorationType, []);
        return;
    }

    const hideDecorations: vscode.DecorationOptions[] = [];
    const overlayDecorations: vscode.DecorationOptions[] = [];

    // Folds correspond to gaps between visible ranges
    for (let i = 0; i < visibleRanges.length - 1; i++) {
        const foldStartLine = visibleRanges[i].end.line;
        const foldEndLine = visibleRanges[i + 1].start.line - 1;

        if (foldEndLine < foldStartLine) {
            continue;
        }

        const headerLine = doc.lineAt(foldStartLine);
        const headerText = headerLine.text;

        // Check if this fold is a C/C++ comment block
        const isDualToken = isDualTokenHeader(headerText);
        const isBanner = isBannerLine(headerText) && (headerText.includes('/*') || headerText.includes('*/'));
        const isCmt = isDualToken || isBanner || headerText.trim().startsWith('/*') || headerText.trim().startsWith('//');

        if (!isCmt) {
            continue;
        }

        // Collect lines in the comment block (including possible closing banner)
        const commentLines: string[] = [headerText];
        const maxScanLine = Math.min(doc.lineCount - 1, foldEndLine + 2);
        for (let l = foldStartLine + 1; l <= maxScanLine; l++) {
            commentLines.push(doc.lineAt(l).text);
        }

        const title = extractCommentTitle(commentLines);
        if (!title) {
            continue;
        }

        const indent = detectIndent([headerText]);
        const width = detectBannerWidth(commentLines);
        const hasBrief = commentLines.some(l => /^\s*(?:\/\*+|\*+|\/\/+)?\s*[@\\]brief\b/i.test(l));
        const compactBanner = buildCompactBanner(title, width, indent, hasBrief);

        // 1. Hide the raw opening asterisks line
        hideDecorations.push({
            range: new vscode.Range(foldStartLine, 0, foldStartLine, headerText.length)
        });

        // 2. Overlay the compact 1-line banner at the start of the header line
        overlayDecorations.push({
            range: new vscode.Range(foldStartLine, 0, foldStartLine, 0),
            renderOptions: {
                after: {
                    contentText: compactBanner
                }
            }
        });

        // 3. If VS Code left closing comment line(s) or border unfolded, hide them (never touch past commentEndLine!)
        let commentEndLine = foldStartLine;
        for (let l = foldStartLine; l < doc.lineCount; l++) {
            const text = doc.lineAt(l).text;
            if (isCommentEnd(text)) {
                commentEndLine = l;
                break;
            }
        }

        if (foldEndLine < commentEndLine) {
            for (let l = foldEndLine + 1; l <= commentEndLine; l++) {
                const nextText = doc.lineAt(l).text;
                if (nextText.trim().length > 0) {
                    hideDecorations.push({
                        range: new vscode.Range(l, 0, l, nextText.length)
                    });
                }
            }
        }
    }

    editor.setDecorations(hideDecorationType, hideDecorations);
    editor.setDecorations(bannerOverlayDecorationType, overlayDecorations);
}

export class CommentFoldingRangeProvider implements vscode.FoldingRangeProvider {
    provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
        const ranges: vscode.FoldingRange[] = [];
        let inComment = false;
        let startLine = 0;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text.trim();
            if (!inComment) {
                if (line.startsWith('/*')) {
                    if (isCommentEnd(line) && !isDualTokenHeader(line)) {
                        continue;
                    }
                    inComment = true;
                    startLine = i;
                }
            } else {
                if (isCommentEnd(line)) {
                    ranges.push(new vscode.FoldingRange(startLine, i, vscode.FoldingRangeKind.Comment));
                    inComment = false;
                }
            }
        }
        return ranges;
    }
}

export function activate(context: vscode.ExtensionContext): void {
    // 0. Register custom CommentFoldingRangeProvider for complete comment folding
    context.subscriptions.push(
        vscode.languages.registerFoldingRangeProvider(
            [{ language: 'c' }, { language: 'cpp' }, { language: 'cuda-cpp' }],
            new CommentFoldingRangeProvider()
        )
    );

    // 1. Initial render & editor switch listener
    if (vscode.window.activeTextEditor) {
        updateFoldDecorations(vscode.window.activeTextEditor);
    }

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            updateFoldDecorations(editor);
        })
    );

    // 2. Visible ranges change listener (fires on fold, unfold, and scroll)
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorVisibleRanges(event => {
            updateFoldDecorations(event.textEditor);
        })
    );

    // 3. Document edits listener
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor && activeEditor.document === event.document) {
                updateFoldDecorations(activeEditor);
            }
        })
    );

    // 4. Command: Refresh previews
    context.subscriptions.push(
        vscode.commands.registerCommand('cCommentFoldHelper.refreshPreviews', () => {
            updateFoldDecorations(vscode.window.activeTextEditor);
        })
    );

    // 5. Command: Toggle compact banner manually (Alt+C / Ctrl+K Ctrl+B)
    context.subscriptions.push(
        vscode.commands.registerCommand('cCommentFoldHelper.toggleCompactBanner', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                return;
            }

            const doc = editor.document;
            const selection = editor.selection;
            const curLineNum = selection.active.line;

            // Find comment boundaries
            let startLineNum = curLineNum;
            while (startLineNum > 0) {
                const text = doc.lineAt(startLineNum).text.trim();
                if (text.startsWith('/*')) {
                    break;
                }
                const prevText = doc.lineAt(startLineNum - 1).text.trim();
                if (prevText.startsWith('*') || prevText.startsWith('/*') || prevText.startsWith('//') || isDualTokenHeader(prevText)) {
                    startLineNum--;
                } else {
                    break;
                }
            }

            let endLineNum = curLineNum;
            while (endLineNum < doc.lineCount - 1) {
                const text = doc.lineAt(endLineNum).text.trim();
                if (isCommentEnd(text)) {
                    break;
                }
                const nextText = doc.lineAt(endLineNum + 1).text.trim();
                if (nextText.startsWith('*') || isCommentEnd(nextText) || isDualTokenHeader(nextText)) {
                    endLineNum++;
                } else {
                    break;
                }
            }

            const range = new vscode.Range(
                new vscode.Position(startLineNum, 0),
                new vscode.Position(endLineNum, doc.lineAt(endLineNum).text.length)
            );

            const blockText = doc.getText(range);
            const lines = blockText.split(/\r?\n/);
            const title = extractCommentTitle(lines) || cleanText(blockText) || 'Section';
            const width = detectBannerWidth(lines);
            const indent = detectIndent(lines);
            const isDualToken = lines.some(l => isDualTokenHeader(l));
            const hasBrief = lines.some(l => /^\s*(?:\/\*+|\*+|\/\/+)?\s*[@\\]brief\b/i.test(l));

            let formatted: string;
            if (lines.length > 1) {
                commentCache.set(title, {
                    text: blockText,
                    width,
                    indent,
                    isDualToken,
                    hasBrief
                });
                formatted = buildCompactBanner(title, width, indent, hasBrief);
            } else {
                const cached = commentCache.get(title);
                if (cached) {
                    formatted = cached.text;
                } else if (width > 0) {
                    formatted = buildBoxBanner(title, width, indent, true, hasBrief);
                } else {
                    formatted = buildCompactBanner(title, 0, indent, hasBrief);
                }
            }

            await editor.edit(editBuilder => {
                editBuilder.replace(range, formatted);
            });
        })
    );
}

export function deactivate(): void {
    hideDecorationType.dispose();
    bannerOverlayDecorationType.dispose();
}
