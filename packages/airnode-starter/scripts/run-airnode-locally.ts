import { join } from 'path';
import { readIntegrationInfo, runAndHandleErrors, runShellCommand } from '../src';

async function main() {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'local') {
    console.log('You only need to run this script if you want to run Airnode locally!');
    return;
  }

  const integrationPath = join(__dirname, '../integrations', integrationInfo.integration);
  runShellCommand(
    `docker run -d -v ${integrationPath}:/app/config --network="host" --name airnode api3/airnode:latest`
  );
}

runAndHandleErrors(main);
