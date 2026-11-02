/**
 * Custom resource handler: provisions the render worker's Cognito password
 * into an SSM SecureString. See credential.ts.
 */
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  SSMClient,
  PutParameterCommand,
  DeleteParameterCommand,
  ParameterNotFound,
} from '@aws-sdk/client-ssm';
import {
  handleWorkerCredential,
  generateWorkerPassword,
  type WorkerCredentialEvent,
} from './credential.js';

const cognito = new CognitoIdentityProviderClient({});
const ssm = new SSMClient({});

export async function handler(event: WorkerCredentialEvent) {
  return handleWorkerCredential(event, {
    async userExists(userPoolId, username) {
      try {
        await cognito.send(new AdminGetUserCommand({ UserPoolId: userPoolId, Username: username }));
        return true;
      } catch (error) {
        if (error instanceof UserNotFoundException) return false;
        throw error;
      }
    },
    async createUser(userPoolId, username) {
      await cognito.send(
        new AdminCreateUserCommand({
          UserPoolId: userPoolId,
          Username: username,
          MessageAction: 'SUPPRESS',
          UserAttributes: [
            { Name: 'email', Value: username },
            { Name: 'email_verified', Value: 'true' },
          ],
        })
      );
    },
    async setPermanentPassword(userPoolId, username, password) {
      await cognito.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: userPoolId,
          Username: username,
          Password: password,
          Permanent: true,
        })
      );
    },
    async putSecureString(name, value) {
      await ssm.send(new PutParameterCommand({ Name: name, Value: value, Type: 'SecureString', Overwrite: true }));
    },
    async deleteParameter(name) {
      try {
        await ssm.send(new DeleteParameterCommand({ Name: name }));
      } catch (error) {
        if (!(error instanceof ParameterNotFound)) throw error;
      }
    },
    generatePassword: generateWorkerPassword,
  });
}
