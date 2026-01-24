import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "studioAssets",
  access: (allow) => ({
    // TODO: This grants broad access to all authenticated users because allow.authenticated
    // does not support {entity_id} substitution. We rely on the app to use correct paths.
    // Future: Use custom claims or groups for finer-grained control.
    "org/*": [allow.authenticated.to(["read", "write", "delete"])],
  }),
});
