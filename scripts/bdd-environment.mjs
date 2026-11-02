import {devNull} from 'node:os';
/** Construct a fresh test environment; this selects repository mocks, not a network sandbox. */
export function prepareBddEnvironment(parent) {
 const child={};
 for(const [key,value] of Object.entries(parent)) {
  const upper=key.toUpperCase();
  if(/^(AWS_|OPENAI_|AZURE_|ELEVENLABS_|GOOGLE_|ANTHROPIC_|GCP_)/.test(upper)||/(API_KEY|ACCESS_TOKEN|SECRET_KEY|CLIENT_SECRET|BEARER_TOKEN)/.test(upper))continue;
  if(value!==undefined)child[key]=value;
 }
 child.CI='true';
 child.AWS_EC2_METADATA_DISABLED='true';
 child.AWS_CONFIG_FILE=devNull;
 child.AWS_SHARED_CREDENTIALS_FILE=devNull;
 return child;
}
