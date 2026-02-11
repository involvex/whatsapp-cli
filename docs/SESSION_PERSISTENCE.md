# Session Persistence & Authentication

## Overview

The WhatsApp CLI now supports persistent authentication sessions. Your login credentials are saved locally and automatically restored on restart, eliminating the need to scan the QR code every time.

## How It Works

### First Run

```
1. Start the app → "ℹ No existing session found - will require QR code scan"
2. QR code displays → Scan with WhatsApp on phone
3. Session saved to `.wwebjs_auth_session/` directory
4. CLI starts normally
```

### Subsequent Runs

```
1. Start the app → "✓ Found existing session - using saved authentication"
2. App authenticates instantly using saved token
3. No QR code needed unless session expires
4. CLI starts normally
```

## Session Storage

- **Location**: `.wwebjs_auth_session/` directory (auto-created)
- **Contents**: WhatsApp Web session data and authentication tokens
- **Size**: ~5-10MB
- **Lifetime**: Session persists until manually logged out

## Managing Sessions

### Check Current Session Status

When you start the app, it will display:

- `✓ Found existing session - using saved authentication` → Using saved session
- `ℹ No existing session found - will require QR code scan` → New authentication needed

### Logout & Clear Session

From the main menu, select **Option 6: Logout & reset**

```
⚠️  Clear authentication and logout? (yes/no): yes
✓ Logged out successfully
✓ Authentication session cleared
✅ Session cleared. Restart the app to re-authenticate.
```

This will:

1. Disconnect from WhatsApp
2. Delete the saved session
3. Force QR code re-scan on next run

### Manually Delete Session

If the app won't start or session is corrupted:

```bash
# Windows
Remove-Item -Path .wwebjs_auth_session -Recurse -Force

# macOS/Linux
rm -rf .wwebjs_auth_session
```

Then restart the app to re-authenticate.

## Session Persistence Features

✅ **Auto-reconnect on restart** - Session automatically restored
✅ **Network resilience** - Automatic reconnection if disconnected
✅ **Session validation** - Checks if session still valid before using
✅ **Manual control** - Option to logout and reset anytime
✅ **Graceful fallback** - If session invalid, prompts for QR scan

## Troubleshooting

### Session Not Persisting

**Problem**: App asks for QR code every restart

**Solutions**:

1. Check if `.wwebjs_auth_session/` folder exists
2. Ensure app has write permissions in the directory
3. Check disk space availability (~10MB required)
4. Try manual logout (Option 6) then restart

### "Session Expired" Error

**Problem**: Session exists but is no longer valid

**Solutions**:

1. Use Option 6 to logout and clear
2. Restart app and scan QR code again
3. This happens after ~30 days of inactivity

### Multiple Concurrent Sessions

**Warning**: Running the app simultaneously in multiple terminals can corrupt the session.

**Solution**: Run only one instance at a time.

## Session Security

⚠️ **Important Security Notes**:

1. **Session Token**: The saved token can be used to access your WhatsApp
2. **File Permissions**: Protect the `.wwebjs_auth_session/` directory
3. **Sharing**: Don't share or commit this folder to version control
4. **Cleanup**: Delete the folder if you stop using the app

## Environment

The `.wwebjs_auth_session` directory is already in `.gitignore`:

```
.wwebjs_auth_session/
```

This ensures your session won't be accidentally committed to version control.

## Implementation Details

### Session Checking (client.ts)

```typescript
// Check if session already exists - if so, reuse it
const authPath = path.resolve("./.wwebjs_auth_session");
const sessionExists = await fs
  .access(authPath)
  .then(() => true)
  .catch(() => false);

if (sessionExists) {
  console.log("✓ Found existing session - using saved authentication");
}
```

### Session Clearing (client.ts)

```typescript
export async function clearAuthSession(): Promise<void> {
  if (clientInstance) {
    await clientInstance.logout();
  }
  const authPath = path.resolve("./.wwebjs_auth_session");
  await fs.rm(authPath, { recursive: true, force: true });
  clientInstance = null;
  initPromise = null;
}
```

### Logout Handler (cli.ts)

```typescript
async function handleLogout(): Promise<void> {
  const confirmation = await promptUser(
    process.stdin as any,
    "⚠️  Clear authentication and logout? (yes/no): ",
  );
  if (confirmation.toLowerCase() === "yes") {
    await clearAuthSession();
    console.log("✅ Session cleared. Restart the app to re-authenticate.");
    state.isExiting = true;
  }
}
```

## Best Practices

1. **Save your session** - Your token is only valid for ~30 days
2. **Logout on shared computers** - Always use Option 6 before leaving
3. **Regular restarts** - Restart app monthly to refresh token
4. **Monitor disk space** - Session folder uses minimal space (~10MB)
5. **Keep app updated** - Update regularly for security patches

---

**Session Persistence enables seamless workflow - authenticate once, use multiple times!**
