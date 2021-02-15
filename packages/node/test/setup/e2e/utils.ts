import orderBy from 'lodash/orderBy';
import fs from 'fs';
import { ethers } from 'ethers';
import { Airnode } from '../../../src/evm/contracts';
import { ChainConfig } from '../../../src/types';

export interface Contracts {
  readonly Airnode: string;
  readonly Convenience: string;
}

export function buildChainConfig(contracts: Contracts): ChainConfig {
  return {
    providerAdmin: '0xC6E0c48092a37CF30733c4D64A72fd46eFECc3d5',
    contracts: {
      Airnode: contracts.Airnode,
      Convenience: contracts.Convenience,
    },
    authorizers: [ethers.constants.AddressZero],
    id: 31337,
    type: 'evm',
    providers: [{ name: 'evm-local', url: 'http://127.0.0.1:8545/' }],
  };
}

export function buildProvider() {
  return new ethers.providers.StaticJsonRpcProvider('http://127.0.0.1:8545/');
}

export async function fetchAllLogs(provider: ethers.providers.JsonRpcProvider, address: string) {
  const airnodeInterface = new ethers.utils.Interface(Airnode.ABI);
  const filter: ethers.providers.Filter = {
    fromBlock: 0,
    address,
  };
  const rawLogs = await provider.getLogs(filter);
  return rawLogs.map((log) => airnodeInterface.parseLog(log));
}

// We want to use a separate account each time we deploy Airnode. These accounts
// are assigned based on the feature file's index in the folder.
export function getDeployerIndex(fullFilePath: string) {
  const features = orderBy(
    fs.readdirSync('./test/e2e', { withFileTypes: true }).filter((item) => !item.isDirectory()),
    ['name']
  );

  const filename = fullFilePath.split(/[\\/]/).pop();

  return features.findIndex((feature) => feature.name === filename);
}
