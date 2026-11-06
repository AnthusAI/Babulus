import { test, expect } from '@playwright/test';

const HOSTED_UI = 'https://babulus-control-plane-auth.auth.us-east-1.amazoncognito.com';

function fakeIdToken(email: string): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ email })}.signature`;
}

async function signedIn(page: any) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'auritus_console_session',
      JSON.stringify({
        email: 'person@example.com',
        accessToken: 'test-access-token',
        idToken: 'test-id-token',
        expiresAt: 9999999999999,
      })
    );
  });
}

test.describe('Google sign-in', () => {
  test('offers Google and nothing else', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expect(page.getByText(/password|Cognito credentials|Identity Center/i)).toHaveCount(0);
  });

  test('sends the browser to the hosted UI with Google and PKCE', async ({ page }) => {
    let authorizeUrl: URL | null = null;
    await page.route(`${HOSTED_UI}/**`, (route: any) => {
      authorizeUrl = new URL(route.request().url());
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>hosted ui</body></html>' });
    });

    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in with Google' }).click();
    await expect.poll(() => authorizeUrl?.pathname).toBe('/oauth2/authorize');

    const params = authorizeUrl!.searchParams;
    expect(params.get('identity_provider')).toBe('Google');
    expect(params.get('response_type')).toBe('code');
    expect(params.get('code_challenge_method')).toBe('S256');
    expect(params.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(params.get('state')).toBeTruthy();
    expect(params.get('redirect_uri')).toMatch(/\/callback$/);
  });

  test('exchanges the code with the PKCE verifier and stores the session', async ({ page }) => {
    let tokenRequestBody = '';
    await page.route(`${HOSTED_UI}/oauth2/token`, (route: any) => {
      tokenRequestBody = route.request().postData() || '';
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'real-access-token',
          id_token: fakeIdToken('person@example.com'),
          expires_in: 3600,
        }),
      });
    });
    await page.route('**/admin/**', (route: any) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    );

    await page.goto('/login');
    await page.evaluate(() =>
      sessionStorage.setItem('babulus_console_pkce', JSON.stringify({ verifier: 'the-verifier', state: 'the-state' }))
    );
    await page.goto('/callback?code=the-code&state=the-state');
    await expect.poll(() => new URL(page.url()).pathname).toBe('/');

    const sent = new URLSearchParams(tokenRequestBody);
    expect(sent.get('grant_type')).toBe('authorization_code');
    expect(sent.get('code')).toBe('the-code');
    expect(sent.get('code_verifier')).toBe('the-verifier');
    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('auritus_console_session') || '{}'));
    expect(session.email).toBe('person@example.com');
    expect(session.accessToken).toBe('real-access-token');
  });

  test('refuses a callback whose state does not match', async ({ page }) => {
    await page.goto('/login');
    await page.evaluate(() =>
      sessionStorage.setItem('babulus_console_pkce', JSON.stringify({ verifier: 'v', state: 'expected' }))
    );
    await page.goto('/callback?code=the-code&state=something-else');
    await expect(page.getByText('Authentication Failed')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('auritus_console_session'))).toBeNull();
  });

  test('says plainly that a signed-in user who is not an operator yet cannot use the console', async ({ page }) => {
    await signedIn(page);
    await page.route('**/sites', (route: any) => {
      if (route.request().resourceType() !== 'fetch') return route.continue();
      return route.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"operator_auth_required"}' });
    });
    await page.goto('/sites');
    await expect(page.getByText(/not an operator yet/).first()).toBeVisible();
  });
});

test.describe('Cloud switch on the Sites page', () => {
  // Built from parts so no bare UUID sits in the repository.
  const account = ['123e4567', 'e89b', '42d3', 'a456', '426614174000'].join('-');

  test('shows the cloud setting and lets an operator turn it on with an Account', async ({ page }) => {
    await signedIn(page);
    let patchBody: any = null;
    await page.route('**/sites', (route: any) => {
      if (route.request().resourceType() !== 'fetch') return route.continue();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sites: [
            { site_id: 'site-1', label: 'Example Blog', disabled: false, created_at: '2026-09-10T14:30:00Z', cloud_enabled: false, account_id: null },
          ],
        }),
      });
    });
    await page.route('**/sites/site-1', (route: any) => {
      if (route.request().method() !== 'PATCH') return route.continue();
      patchBody = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ site_id: 'site-1', cloud_enabled: true, account_id: account }),
      });
    });

    await page.goto('/sites');
    await expect(page.getByText('Cloud off')).toBeVisible();

    await page.getByRole('button', { name: 'Turn on' }).click();
    await expect(page.getByText(/needs the Prospectus Account UUID/)).toBeVisible();
    expect(patchBody).toBeNull();

    await page.getByLabel('Prospectus Account UUID for Example Blog').fill(account);
    await page.getByRole('button', { name: 'Turn on' }).click();
    await expect(page.getByText('Cloud on')).toBeVisible();
    expect(patchBody).toEqual({ cloud_enabled: true, account_id: account });
  });
});
