/**
 * Synthesizes the cookie sealing parameter stack on its own (no Amplify, no AWS calls) and prints the template as JSON,
 * for the BDD steps to inspect.
 */
import { App, CfnOutput, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { SealingParameter } from "../amplify/session-secret/sealing-parameter.js";
import { sealingParameterName } from "../amplify/session-secret/naming.js";

const stack = new Stack(new App(), "ProspectusSession", { env: { account: "000000000000", region: "us-east-1" } });
const parameter = new SealingParameter(stack, "SealingParameter", { parameterName: sealingParameterName(process.env) });
new CfnOutput(stack, "SessionSecretParameter", { value: parameter.parameterName });
new CfnOutput(stack, "SessionSecretParameterArn", { value: parameter.parameterArn });
console.log(`SYNTH=${JSON.stringify(Template.fromStack(stack).toJSON())}`);
