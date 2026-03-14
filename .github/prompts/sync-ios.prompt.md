---
description: "Build the web app and sync to the iOS Capacitor project"
tools: ["execute/runInTerminal", "execute/getTerminalOutput", "agent/runSubagent"]
---

# Sync iOS

Build the web app and sync changes to the Xcode project.

## Steps

1. Switch to Node 22 (required by Capacitor CLI):
   ```bash
   nvm use 22
   ```

2. Build the web app:
   ```bash
   npm run build
   ```
   Fix any build errors before proceeding.

3. Sync to iOS:
   ```bash
   npx cap sync ios
   ```

4. Report sync result.

## If Errors Occur

### Build fails
- Check TypeScript errors: `npx tsc --noEmit`
- Dispatch `@debug-executor` with the error output

### cap sync fails with CocoaPods error
```bash
cd ios/App && pod repo update && pod install && cd ../..
npx cap sync ios
```

### cap sync fails with Node version error
```bash
nvm install 22 && nvm use 22
npx cap sync ios
```

## After Successful Sync

To test in simulator:
```bash
npm run cap:open:ios
```
Then in Xcode: select a simulator → press Run (⌘R).

## Output

```markdown
## iOS Sync Complete

- Web build: ✅
- cap sync: ✅
- Plugins synced: [list if any new]
- Manual step: Open Xcode with `npm run cap:open:ios`
```
