import { join } from 'path';
import { cliPrint, readIntegrationInfo, runAndHandleErrors, runShellCommand } from '../src';

const main = async () => {
  const integrationInfo = readIntegrationInfo();
  if (integrationInfo.airnodeType !== 'local') {
    cliPrint.error('You only need to run this script if you want to run Airnode locally!');
    return;
  }

  const integrationPath = join(__dirname, '../integrations', integrationInfo.integration);
  runShellCommand(
    `docker run --rm -v ${integrationPath}:/app/config --network="host" --name airnode api3/airnode-client:latest`
  );
};

runAndHandleErrors(main);
