import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { storage } from "./storage/resource.js";
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const backend = defineBackend({
  auth,
  data,
  storage,
});

// ==========================================
// Rendering is local only
// ==========================================
//
// The Studio backend runs no compute of its own. Video renders run on a
// worker the user starts themselves (`babulus worker`), so there is no ECS
// cluster, task definition, render trigger, worker credential, scheduled
// function or alarm here, and nothing reads the Job table's change stream.
//
// The Job table's stream stays enabled only so this change does not touch the
// table; no consumer reads it, and turning it off is a separate, reviewed step.
const amplifyJobTable = backend.data.resources.cfnResources.amplifyDynamoDbTables['Job'];
if (amplifyJobTable) {
  amplifyJobTable.streamSpecification = {
    streamViewType: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
  };
}
