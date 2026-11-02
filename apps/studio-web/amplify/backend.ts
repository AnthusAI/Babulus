import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { storage } from "./storage/resource.js";
// import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
// import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
// import { experimental } from 'aws-cdk-lib/aws-cloudfront';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { cliLoginBrokerCode, cliLoginPagesCode } from "./cli-login/bundle.js";
import { cliCallbackUrls } from "./cli-login/callbacks.js";
import { cognitoAuthorizeEndpoint } from "./cli-login/cognito-endpoint.js";
import { addCliRemoteLogin, planAppOrigin, planCliApiEndpoint, planCliRemoteLogin } from "./cli-login/remote-login.js";

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

// ==========================================
// `babulus login`: return URLs, public values and the optional remote broker
// ==========================================
//
// The command signs in on the Studio's web app client. This adds its loopback return URL to that client (and the
// remote one when remote sign-in is on), and publishes the public values under `custom.cliLogin` in the outputs,
// which the Studio serves at /.well-known/babulus-cli.json. Remote sign-in (a broker Lambda, a table and the
// approval pages function) exists only when BABULUS_ENABLE_CLI_REMOTE_LOGIN=true; every value comes from the
// deployment's environment, never from this repository. See docs/cli-login.md.
const cliAppOrigin = planAppOrigin(process.env);
const cliApiEndpoint = planCliApiEndpoint(process.env);
const cliRemotePlan = planCliRemoteLogin(process.env.BABULUS_ENABLE_CLI_REMOTE_LOGIN?.trim() === "true", process.env);
const cliRemote = cliRemotePlan && cliApiEndpoint
  ? addCliRemoteLogin(backend.createStack("CliRemoteLogin"), {
      plan: cliRemotePlan,
      clientId: backend.auth.resources.userPoolClient.userPoolClientId,
      apiEndpoint: cliApiEndpoint,
      authorizeEndpoint: cognitoAuthorizeEndpoint(backend.auth.stack),
      product: `Babulus (${new URL(cliRemotePlan.origin).host})`,
      brokerCode: cliLoginBrokerCode(),
      pagesCode: cliLoginPagesCode(),
      alarmTopicArn: (process.env.BABULUS_ALARM_TOPIC_ARN ?? "").trim() || undefined,
    })
  : undefined;
if (cliRemotePlan && !cliApiEndpoint) {
  throw new Error("Remote CLI login needs BABULUS_JOBS_API_ENDPOINT, the jobs API's https URL the broker serves.");
}
if (cliApiEndpoint && cliAppOrigin) {
  const webClient = backend.auth.resources.cfnResources.cfnUserPoolClient;
  // Return URLs only make sense on a client that has OAuth switched on (the Google-only sign-in resource does).
  if (webClient.allowedOAuthFlowsUserPoolClient !== true) {
    throw new Error("The command's return URLs need an OAuth-enabled web app client; configure Google sign-in in amplify/auth first.");
  }
  const registered = new Set<string>(webClient.callbackUrLs ?? []);
  for (const url of cliCallbackUrls(cliRemote?.remoteCallbackUri)) registered.add(url);
  webClient.callbackUrLs = [...registered];
  backend.addOutput({
    custom: {
      cliLogin: {
        apiEndpoint: cliApiEndpoint,
        appOrigin: cliAppOrigin,
        ...(cliRemote
          ? {
              brokerEndpoint: cliRemote.brokerEndpoint,
              remoteCallbackUri: cliRemote.remoteCallbackUri,
              pagesFunctionArn: cliRemote.pagesFunctionArn,
            }
          : {}),
      },
    },
  });
}
