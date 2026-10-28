import { randomBytes, randomInt } from 'crypto';

/**
 * Provisions the render worker's Cognito credential.
 *
 * The password is generated here, set on the worker's Cognito user and written
 * to an SSM SecureString. It is never returned, logged or kept in source.
 * Every create or update generates a new password, so changing the
 * custom resource's Rotation property rotates it.
 */

export interface WorkerCredentialProperties {
  UserPoolId: string;
  Username: string;
  ParameterName: string;
}

export interface WorkerCredentialDeps {
  userExists(userPoolId: string, username: string): Promise<boolean>;
  createUser(userPoolId: string, username: string): Promise<void>;
  setPermanentPassword(userPoolId: string, username: string, password: string): Promise<void>;
  putSecureString(name: string, value: string): Promise<void>;
  deleteParameter(name: string): Promise<void>;
  generatePassword(): string;
}

export interface WorkerCredentialEvent {
  RequestType: 'Create' | 'Update' | 'Delete';
  ResourceProperties: WorkerCredentialProperties;
  PhysicalResourceId?: string;
}

export interface WorkerCredentialResult {
  PhysicalResourceId: string;
}

const SYMBOLS = '-_!@#%^*+=';
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';

/** 40 random URL-safe characters plus one from each Cognito policy class. */
export function generateWorkerPassword(): string {
  const pick = (chars: string) => chars[randomInt(chars.length)];
  return randomBytes(30).toString('base64url') + pick(UPPER) + pick(LOWER) + pick(DIGITS) + pick(SYMBOLS);
}

export async function handleWorkerCredential(
  event: WorkerCredentialEvent,
  deps: WorkerCredentialDeps
): Promise<WorkerCredentialResult> {
  const { UserPoolId, Username, ParameterName } = event.ResourceProperties;

  if (event.RequestType === 'Delete') {
    await deps.deleteParameter(event.PhysicalResourceId ?? ParameterName);
    return { PhysicalResourceId: event.PhysicalResourceId ?? ParameterName };
  }

  if (!(await deps.userExists(UserPoolId, Username))) {
    await deps.createUser(UserPoolId, Username);
  }

  const password = deps.generatePassword();
  await deps.setPermanentPassword(UserPoolId, Username, password);
  await deps.putSecureString(ParameterName, password);

  return { PhysicalResourceId: ParameterName };
}
