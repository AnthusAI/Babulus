import { defineStorage } from "@aws-amplify/backend";

// No signed-in user, and no guest, can touch `org/*` directly. Account media is read and written only by the
// Studio server, which verifies the caller's Account membership from the ID token and then signs a short-lived
// URL or acts itself with its own role (see lib/account-media.ts). `published/*` is public to read and has no
// client write rule: publishing copies a file there from the server.
export const storage = defineStorage({
  name: "studioAssets",
  access: (allow) => ({
    "published/*": [allow.guest.to(["read"])],
  }),
});
