import type { CloudFrontRequestHandler, CloudFrontRequestEvent } from 'aws-lambda';

export const handler: CloudFrontRequestHandler = async (event: CloudFrontRequestEvent) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;

  // Extract path parts
  const pathParts = uri.split('/').filter(p => p);

  // Special case: published content is public
  if (pathParts[0] === 'published') {
    return request;
  }

  // Validate org path structure
  if (pathParts[0] !== 'org' || !pathParts[1]) {
    return {
      status: '400',
      statusDescription: 'Bad Request',
      body: 'Invalid path structure',
    };
  }

  const orgId = pathParts[1];

  // Get auth token from cookie or Authorization header
  const authToken =
    request.headers.authorization?.[0]?.value?.replace('Bearer ', '') ||
    parseCookie(request.headers.cookie?.[0]?.value || '')['accessToken'] ||
    parseCookie(request.headers.cookie?.[0]?.value || '')['idToken'];

  if (!authToken) {
    return {
      status: '401',
      statusDescription: 'Unauthorized',
      body: 'Authentication required',
    };
  }

  // For now, we'll do basic JWT parsing without full verification
  // In production, you'd want to verify the signature against Cognito JWKS
  try {
    const payload = parseJWT(authToken);

    // Extract user's org from custom claim or validate against orgId
    // This is a simplified check - in production you'd query OrgMember table
    // or include org list in JWT custom claims

    // For now, allow all authenticated requests
    // TODO: Add proper org membership validation
    return request;
  } catch (err) {
    return {
      status: '403',
      statusDescription: 'Forbidden',
      body: 'Invalid token',
    };
  }
};

function parseCookie(cookieHeader: string): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const parts = c.trim().split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );
}

function parseJWT(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT format');

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (err) {
    throw new Error('Failed to parse JWT');
  }
}
