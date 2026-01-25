import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { storage } from "./storage/resource.js";
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backend = defineBackend({ auth, data, storage });

// Get the S3 bucket from Amplify Storage
const bucket = backend.storage.resources.bucket;

// Create Lambda@Edge function for authorization
const edgeAuth = new lambda.Function(backend.stack, 'EdgeAuthFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset(path.join(__dirname, 'edge-functions/auth')),
});

// Create CloudFront distribution
const distribution = new cloudfront.Distribution(backend.stack, 'AssetCDN', {
  defaultBehavior: {
    origin: new origins.S3Origin(bucket),
    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    edgeLambdas: [{
      eventType: cloudfront.LambdaEdgeEventType.VIEWER_REQUEST,
      functionVersion: edgeAuth.currentVersion,
    }],
  },
});

// Export CloudFront domain for use in app
backend.addOutput({
  custom: {
    assetsDomain: distribution.distributionDomainName,
  },
});
