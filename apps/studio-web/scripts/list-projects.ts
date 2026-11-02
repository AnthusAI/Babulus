import { generateClient } from "aws-amplify/data";
// @ts-ignore
import outputs from "../amplify_outputs.json";
import { Amplify } from "aws-amplify";

// Configure Amplify for script context
Amplify.configure(outputs, { ssr: false });

const client = generateClient<any>();

async function main() {
  // List orgs
  const { data: orgs } = await client.models.Org.list({});
  console.log("Organizations:");
  orgs?.forEach(org => {
    console.log(`  - ${org.name} (ID: ${org.id})`);
  });

  // List projects
  const { data: projects } = await client.models.Project.list({});
  console.log("\nProjects:");
  projects?.forEach(project => {
    console.log(`  - ${project.name} (ID: ${project.id}, Org: ${project.orgId})`);
  });
}

main();
