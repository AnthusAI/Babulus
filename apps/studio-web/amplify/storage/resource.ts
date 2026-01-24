import { defineStorage } from "@aws-amplify/backend";

export const storage = defineStorage({
  name: "studioAssets",
  access: (allow) => ({
    "org/{entity_id}/*": [allow.authenticated.to(["read", "write", "delete"])],
  }),
});
