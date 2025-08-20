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
pnpm run pkg          # Production build
pnpm run package      # Create VSIX package
pnpm run package:alpha # Create alpha release

# Publishing
pnpm run publish      # Full publish pipeline (pre-checks + VSCode + GitHub)
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
- `src/hook.ts` - Dynamic hook loading and execution engine
- `src/handler.ts` - Command handlers and UI interaction
- `src/i18n.ts` - I18n data management and caching

### Hook Context API
Hooks receive a rich context object with:
- Full VSCode API (`vscode` namespace)
- Utilities: `lodash`, `crypto-js`, `uuid`, `qs`, `babel` parser/traverse
- Extension APIs: `showMessage`, `writeFileByEditor`, `getConfig`
- I18n instance: `I18n.getInstance()`

### Data Types
Key type to understand:
```typescript
type ConvertGroup = {
    i18nValue: string;      // Text to convert
    range?: Range;          // Position in document
    i18nKey?: string;       // Generated key
    type?: ConvertType;     // New or Exist
}
```

### Configuration
Users configure via VSCode settings:
- `i18nFilePattern` - Where to find i18n files
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
- Cached and watched for changes
- Reloaded on file modification
- Errors are caught and displayed to user

## Common Tasks

### Adding New Hook Method
1. Define method in `src/hook.ts`
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

1. Update version in `package.json`
2. Run `pnpm run publish` - handles everything:
   - Pre-checks (lint, compile)
   - Version update
   - Changelog generation
   - VSCode Marketplace publish
   - GitHub release creation