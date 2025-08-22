# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

I18n Fast is a hook-driven VSCode extension for internationalization that delegates all i18n logic to user-defined JavaScript hooks, making it adaptable to any framework or technology stack.

## Development Commands

```bash
# Development
pnpm run compile       # Compile TypeScript with webpack
pnpm run watch        # Watch mode for development

# Code Quality  
pnpm run lint         # ESLint for src/**/*.ts

# Build & Package
pnpm run pkg          # Production build with webpack (minified)
pnpm run package      # Create VSIX package using vsce
pnpm run package:alpha # Create alpha/prerelease VSIX

# Publishing (requires GITHUB_TOKEN and OPEN_VSX_TOKEN env vars)
pnpm run publish      # Full publish pipeline (all steps below)
pnpm run publish:pre  # Pre-checks, version update, changelog
pnpm run publish:all  # Publish to all marketplaces
pnpm run publish:vscode   # VSCode Marketplace only
pnpm run publish:openvsx  # Open VSX Registry only
pnpm run publish:github   # GitHub release only
```

## Architecture

### Core Hook System
The extension operates through a 5-hook lifecycle that users implement in `.vscode/i18n-fast.hook.js`:

1. **`hook.match`** - Find text to convert in documents
2. **`hook.convert`** - Transform matched text to i18n keys  
3. **`hook.write`** - Write changes to i18n files
4. **`hook.collectI18n`** - Collect existing i18n entries
5. **`hook.matchI18n`** - Filter/customize i18n display

### Key Components
- `src/extension.ts` - Extension activation and command registration
- `src/utils/hook.ts` - Dynamic hook loading and execution engine
- `src/handlers/` - Command handlers and UI interaction
- `src/utils/i18n.ts` - I18n data management and caching
- `src/providers/` - VSCode providers (jump definitions, memory documents)
- `src/utils/watcher.ts` - File watching for hook and i18n files
- `src/utils/FileSnapshotStack.ts` - Undo/redo support for file changes

### Hook Context API
Hooks receive a rich context object with:
- Full VSCode API (`vscode` namespace)
- Utilities: `lodash`, `crypto-js`, `uuid`, `qs`, `babel` parser/traverse
- Extension APIs: `showMessage`, `writeFileByEditor`, `getConfig`
- I18n instance: `I18n.getInstance()`

### Data Types
Key types to understand:
```typescript
type ConvertGroup = {
    i18nValue: string;      // Text to convert
    matchedText?: string;   // Original matched text
    range?: Range;          // Position in document
    i18nKey?: string;       // Generated key
    params?: Record<string, any>;  // Custom params
    overwriteText?: string; // Text to replace with
    type?: ConvertType;     // 'new' or 'exist'
}

type I18nGroup = {
    key: string;            // i18n key
    value: string;          // i18n value
    valueAST?: MessageFormatElement[]; // Parsed ICU format
    filePath?: string;      // Source file
    line?: number;          // Line number
    range?: Range;          // Document range
    supportType?: SupportType;  // Behavior flags
    renderOption?: DecorationOptions['renderOptions'];
    hoverMessage?: DecorationOptions['hoverMessage'];
    locationLink?: Definition | DefinitionLink[];
}
```

### Configuration
Users configure via VSCode settings:
- `i18nFilePattern` - Glob pattern for i18n files (supports workspace-specific patterns)
- `hookFilePattern` - Hook file location (default: `.vscode/i18n-fast.hook.js`)
- `conflictPolicy` - How to handle duplicates: `reuse`|`ignore`|`picker`|`smart`
- `autoMatchChinese` - Auto-detect Chinese text

## Testing & Examples

No unit tests - instead uses real-world example projects:
- `test/react/` - React with formatMessage pattern
- `test/php/` - PHP with array syntax
- `test/vue/` - Vue i18n integration

Each example includes a complete `.vscode/i18n-fast.hook.js` implementation.

## Important Patterns

### Batch Matching & Conversion
The extension supports batch matching and conversion of multiple text entries in a single operation:
- Groups text entries by value to avoid duplicate processing
- Handles conflict resolution for each unique text value
- Processes all conversions sequentially using `asyncMap`
- Supports automatic Chinese text matching when enabled
- Priority: provided groups > selected text > hook.match > Chinese matching

### File Operations
Always use `FileSnapshotStack` for undoable operations:
```typescript
FileSnapshotStack.getInstance().next();  // Before changes
// ... make changes
// User can undo with Ctrl+Alt+B
```

### Error Handling
Wrap handlers with `asyncInvokeWithErrorHandler`:
```typescript
return asyncInvokeWithErrorHandler(handler);
```

### Hook Loading
Hooks are CommonJS modules loaded dynamically:
- Cached and watched for changes via `chokidar`
- Reloaded on file modification
- Errors are caught and displayed to user
- Support for requiring project dependencies

### Commands & Keybindings
- **Convert** (`Ctrl+Alt+C` / `Cmd+Alt+C`): Convert selected text to i18n
- **Paste** (`Ctrl+Alt+V` / `Cmd+Alt+V`): Paste and convert clipboard text
- **Undo** (`Ctrl+Alt+B` / `Cmd+Alt+B`): Undo last file operation

## Common Tasks

### Adding New Hook Method
1. Define method in `src/utils/hook.ts`
2. Add to hook context in `genContext()`
3. Document in template at `example/i18n-fast.hook.template.js`

### Modifying ConvertGroup Structure
⚠️ **Breaking Change**: External hooks depend on this structure. Changes require:
1. Update type in `src/types/index.ts`
2. Update all usages in handlers
3. Document migration path for hook authors
4. Label PR as `breaking change`

### Debugging Hooks
Hooks can use `showMessage` for debugging:
```javascript
context.showMessage('info', 'Debug: ' + JSON.stringify(data));
```

## Release Process

The release process is automated via `scripts/publish.mjs`:

1. **Manual Steps:**
   - Update version in `package.json` (or let script auto-increment)
   - Set environment variables: `GITHUB_TOKEN`, `OPEN_VSX_TOKEN` (optional)

2. **Automated Steps (via `pnpm run publish`):**
   - Pre-checks: lint and compile validation
   - Version update (if not manually done)
   - Changelog generation from git commits
   - VSIX package creation
   - VSCode Marketplace publishing (via vsce)
   - Open VSX publishing (if token provided)
   - Git tag creation and push
   - GitHub release with VSIX attachment

The script supports partial execution via `--tasks` flag for specific steps.