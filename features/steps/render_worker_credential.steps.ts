/**
 * Step definitions for the render worker credential custom resource.
 */

import { Given, When, Then, Before } from '@cucumber/cucumber';
import { strict as assert } from 'assert';
import {
  handleWorkerCredential,
  generateWorkerPassword,
  type WorkerCredentialDeps,
  type WorkerCredentialEvent,
  type WorkerCredentialResult,
} from '../../apps/studio-web/amplify/functions/render-worker-credential/credential.js';

const PROPS = {
  UserPoolId: 'us-east-1_test',
  Username: 'render-worker@example.test',
  ParameterName: '/babulus/test-stack/render-worker-password',
};

interface CredentialContext {
  userExists: boolean;
  createdUsers: string[];
  passwords: string[];
  parameters: Map<string, string>;
  deletedParameters: string[];
  generated: string[];
  result: WorkerCredentialResult | null;
  passwordBeforeWhen: string | undefined;
  sample: string;
}

let ctx: CredentialContext;
let counter = 0;

Before(() => {
  ctx = {
    userExists: false,
    createdUsers: [],
    passwords: [],
    parameters: new Map(),
    deletedParameters: [],
    generated: [],
    result: null,
    passwordBeforeWhen: undefined,
    sample: '',
  };
});

function deps(): WorkerCredentialDeps {
  return {
    async userExists() {
      return ctx.userExists;
    },
    async createUser(_pool, username) {
      ctx.createdUsers.push(username);
      ctx.userExists = true;
    },
    async setPermanentPassword(_pool, _username, password) {
      ctx.passwords.push(password);
    },
    async putSecureString(name, value) {
      ctx.parameters.set(name, value);
    },
    async deleteParameter(name) {
      ctx.deletedParameters.push(name);
      ctx.parameters.delete(name);
    },
    generatePassword() {
      const password = `generated-${++counter}`;
      ctx.generated.push(password);
      return password;
    },
  };
}

async function run(requestType: WorkerCredentialEvent['RequestType']) {
  ctx.passwordBeforeWhen = ctx.passwords.at(-1);
  ctx.result = await handleWorkerCredential(
    { RequestType: requestType, ResourceProperties: PROPS, PhysicalResourceId: requestType === 'Create' ? undefined : PROPS.ParameterName },
    deps()
  );
}

Given('the worker user does not exist in the user pool', () => {
  ctx.userExists = false;
});

Given('the worker user already exists in the user pool', () => {
  ctx.userExists = true;
});

Given('the credential resource was created with one password', async () => {
  await run('Create');
  ctx.createdUsers = [];
});

When('the credential resource is created', async () => {
  await run('Create');
});

When('the credential resource is updated', async () => {
  await run('Update');
});

When('the credential resource is deleted', async () => {
  await run('Delete');
});

Then('the worker user is created without an invitation message', () => {
  assert.deepEqual(ctx.createdUsers, [PROPS.Username]);
});

Then('no worker user is created', () => {
  assert.deepEqual(ctx.createdUsers, []);
});

Then("the worker user's permanent password is the generated password", () => {
  assert.equal(ctx.passwords.at(-1), ctx.generated.at(-1));
});

Then("the worker user's permanent password is a new generated password", () => {
  assert.equal(ctx.passwords.at(-1), ctx.generated.at(-1));
  assert.notEqual(ctx.passwords.at(-1), ctx.passwordBeforeWhen);
});

Then('the SSM SecureString holds the generated password', () => {
  assert.equal(ctx.parameters.get(PROPS.ParameterName), ctx.generated.at(-1));
});

Then('the SSM SecureString holds the new password', () => {
  assert.equal(ctx.parameters.get(PROPS.ParameterName), ctx.passwords.at(-1));
});

Then('the resource result does not contain the password', () => {
  assert.ok(!JSON.stringify(ctx.result).includes(ctx.generated.at(-1)!));
  assert.equal(ctx.result?.PhysicalResourceId, PROPS.ParameterName);
});

Then('the SSM SecureString is deleted', () => {
  assert.deepEqual(ctx.deletedParameters, [PROPS.ParameterName]);
  assert.equal(ctx.parameters.has(PROPS.ParameterName), false);
});

Then("the worker user's password is not changed", () => {
  assert.equal(ctx.passwords.at(-1), ctx.passwordBeforeWhen);
});

When('a worker password is generated', () => {
  ctx.sample = generateWorkerPassword();
});

Then('it is at least 40 characters long', () => {
  assert.ok(ctx.sample.length >= 40);
});

Then('it contains an uppercase letter, a lowercase letter, a digit and a symbol', () => {
  assert.match(ctx.sample, /[A-Z]/);
  assert.match(ctx.sample, /[a-z]/);
  assert.match(ctx.sample, /[0-9]/);
  assert.match(ctx.sample, /[^A-Za-z0-9]/);
});

Then('a second generated password is different', () => {
  assert.notEqual(generateWorkerPassword(), ctx.sample);
});
