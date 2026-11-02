#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {prepareBddEnvironment} from './bdd-environment.mjs';
const cucumber=fileURLToPath(new URL('../node_modules/@cucumber/cucumber/bin/cucumber-js',import.meta.url));
const features=process.argv.slice(2);
const child=spawn(process.execPath,['--import','tsx',cucumber,'--require','features/steps/**/*.ts',...(features.length?features:['features/**/*.feature'])],{env:prepareBddEnvironment(process.env),stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{if(child.exitCode===null)child.kill(signal);});
child.on('error',error=>{console.error(`BDD launcher failed: ${error.message}`);process.exitCode=1;});
child.on('exit',(code,signal)=>{process.exitCode=code??(signal==='SIGINT'?130:signal==='SIGTERM'?143:1);});
