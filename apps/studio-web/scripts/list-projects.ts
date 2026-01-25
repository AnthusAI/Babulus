import { generateServerClientUsingCookies } from '@aws-amplify/adapter-nextjs/data';
// @ts-ignore
import type { Schema } from '../amplify/data/resource.js';
// @ts-ignore
import outputs from '../amplify_outputs.json';

const client = generateServerClientUsingCookies<Schema>({
  config: outputs,
  cookies: () => ({}),
});

async function main() {
  // List orgs
  const { data: orgs } = await client.models.Org.list();
  console.log('Organizations:');
  orgs?.forEach(org => {
    console.log(`  - ${org.name} (ID: ${org.id})`);
  });

  // List projects
  const { data: projects } = await client.models.Project.list();
  console.log('\nProjects:');
  projects?.forEach(project => {
    console.log(`  - ${project.name} (ID: ${project.id}, Org: ${project.orgId})`);
  });
}

main();
