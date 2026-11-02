import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { storage } from "./storage/resource.js";
// import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
// import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
// import { experimental } from 'aws-cdk-lib/aws-cloudfront';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const backend = defineBackend({
  auth,
  data,
  storage,
});

// TODO: Re-enable CloudFront distribution with Lambda@Edge
// Currently disabled to avoid cross-region deployment issues in Amplify sandbox
// See: https://github.com/aws-amplify/amplify-category-api/issues/xxxx
//
// To re-enable:
// 1. Ensure us-east-1 region is bootstrapped: npx cdk bootstrap aws://ACCOUNT/us-east-1
// 2. Uncomment the EdgeFunction and CloudFront distribution code below
//
// // Create Lambda@Edge function for authorization
// const edgeAuth = new experimental.EdgeFunction(backend.stack, 'EdgeAuthFunction', {
//   runtime: lambda.Runtime.NODEJS_20_X,
//   handler: 'index.handler',
//   code: lambda.Code.fromAsset(path.join(__dirname, 'edge-functions/auth')),
//   stackId: 'EdgeAuth',
// });
//
// // Create CloudFront distribution
// const distribution = new cloudfront.Distribution(backend.stack, 'AssetCDN', {
//   defaultBehavior: {
//     origin: new origins.S3Origin(bucket),
//     allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
//     viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
//     cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
//     edgeLambdas: [{
//       eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
//       functionVersion: edgeAuth.currentVersion,
//     }],
//   },
// });
//
// // Export CloudFront domain for use in app
// backend.addOutput({
//   custom: {
//     assetsDomain: distribution.distributionDomainName,
//   },
// });

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
