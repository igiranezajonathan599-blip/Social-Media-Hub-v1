---
name: Managed Clerk provisioning
description: Safe account administration when Replit-managed Clerk dashboard access is restricted.
---

For Replit-managed Clerk, dashboard access and server-side account administration are separate capabilities. A project can report restricted dashboard access while its existing secret-backed backend path can still manage users.

**Why:** The application needed a specific verified admin account, but the managed Clerk dashboard was not available in the current plan. The existing backend management path allowed the account to be handled without adding a second authentication system.

**How to apply:** Check Clerk management status before making auth changes. Use the existing server-side Clerk path for authorized account operations, never store a user's password in source or the database, and remember that Development and Production Clerk user stores are separate.