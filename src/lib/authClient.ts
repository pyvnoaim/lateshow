import { passkeyClient } from "@better-auth/passkey/client";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Browser side of auth. Same origin as the app, so no base URL needed. */
export const authClient = createAuthClient({ plugins: [emailOTPClient(), passkeyClient()] });
