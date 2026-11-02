import {Given,When,Then} from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import {devNull} from 'node:os';
import {prepareBddEnvironment} from '../../scripts/bdd-environment.mjs';
let parent:Record<string,string>,child:NodeJS.ProcessEnv;
Given('a behavior test parent environment containing fake provider credentials and CI false',()=>{parent={CI:'false',PATH:'/example/bin',CUSTOM_FLAG:'keep',AWS_ACCESS_KEY_ID:'fake',AWS_SECRET_ACCESS_KEY:'fake',AWS_SESSION_TOKEN:'fake',AWS_PROFILE:'fake',AWS_CONTAINER_CREDENTIALS_FULL_URI:'http://fake',AWS_WEB_IDENTITY_TOKEN_FILE:'/fake',OPENAI_API_KEY:'fake',AZURE_SPEECH_KEY:'fake',ELEVENLABS_API_KEY:'fake',GOOGLE_APPLICATION_CREDENTIALS:'/fake'};});
When('the behavior test launch environment is prepared',()=>{child=prepareBddEnvironment(parent);});
Then('provider credential sources are removed and mock mode is forced',()=>{assert.equal(child.CI,'true');for(const key of ['AWS_ACCESS_KEY_ID','AWS_SECRET_ACCESS_KEY','AWS_SESSION_TOKEN','AWS_PROFILE','AWS_CONTAINER_CREDENTIALS_FULL_URI','AWS_WEB_IDENTITY_TOKEN_FILE','OPENAI_API_KEY','AZURE_SPEECH_KEY','ELEVENLABS_API_KEY','GOOGLE_APPLICATION_CREDENTIALS'])assert.equal(child[key],undefined,key);assert.equal(child.AWS_EC2_METADATA_DISABLED,'true');assert.equal(child.AWS_CONFIG_FILE,devNull);assert.equal(child.AWS_SHARED_CREDENTIALS_FILE,devNull);});
Then('unrelated environment settings remain available',()=>{assert.equal(child.CUSTOM_FLAG,'keep');assert.equal(child.PATH,'/example/bin');assert.equal(parent.CI,'false');});

Given('ordinary behavior tests are running',()=>{});
Then('the active process uses isolated mock mode',()=>{assert.equal(process.env.CI,'true');assert.equal(process.env.AWS_ACCESS_KEY_ID,undefined);assert.equal(process.env.OPENAI_API_KEY,undefined);assert.equal(process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI,undefined);assert.equal(process.env.AWS_EC2_METADATA_DISABLED,'true');assert.equal(process.env.AWS_CONFIG_FILE,devNull);assert.equal(process.env.AWS_SHARED_CREDENTIALS_FILE,devNull);});
