import { ethers } from 'ethers';
import flatMap from 'lodash/flatMap';
import * as logger from '../../logger';
import { ApiCall, Request, LogsData, RequestErrorMessage, RequestStatus } from '../../types';

interface ValidatedField {
  readonly type: string;
  readonly value: any;
}

function getValidatedFields(apiCall: Request<ApiCall>): ValidatedField[] {
  switch (apiCall.type) {
    case 'template':
      return [
        { value: ethers.BigNumber.from(apiCall.chainId), type: 'uint256' },
        { value: apiCall.metadata.address, type: 'address' },
        { value: apiCall.requesterAddress, type: 'address' },
        { value: ethers.BigNumber.from(apiCall.requestCount), type: 'uint256' },
        { value: apiCall.templateId, type: 'bytes32' },
        { value: apiCall.sponsorAddress, type: 'address' },
        { value: apiCall.sponsorWalletAddress, type: 'address' },
        { value: apiCall.fulfillAddress, type: 'address' },
        { value: apiCall.fulfillFunctionId, type: 'bytes4' },
        { value: apiCall.encodedParameters, type: 'bytes' },
      ];

    case 'full':
      return [
        { value: ethers.BigNumber.from(apiCall.chainId), type: 'uint256' },
        { value: apiCall.metadata.address, type: 'address' },
        { value: apiCall.requesterAddress, type: 'address' },
        { value: ethers.BigNumber.from(apiCall.requestCount), type: 'uint256' },
        { value: apiCall.airnodeAddress, type: 'address' },
        { value: apiCall.endpointId, type: 'bytes32' },
        { value: apiCall.sponsorAddress, type: 'address' },
        { value: apiCall.sponsorWalletAddress, type: 'address' },
        { value: apiCall.fulfillAddress, type: 'address' },
        { value: apiCall.fulfillFunctionId, type: 'bytes4' },
        { value: apiCall.encodedParameters, type: 'bytes' },
      ];
  }
}

function getExpectedRequestId(apiCall: Request<ApiCall>): string {
  const validatedFields = getValidatedFields(apiCall);

  const types = validatedFields.map((v) => v.type);
  const values = validatedFields.map((v) => v.value);

  return ethers.utils.keccak256(ethers.utils.solidityPack(types, values));
}

export function verifyApiCallIds(apiCalls: Request<ApiCall>[]): LogsData<Request<ApiCall>[]> {
  const logsWithVerifiedApiCalls: LogsData<Request<ApiCall>>[] = apiCalls.map((apiCall) => {
    if (apiCall.status !== RequestStatus.Pending) {
      const log = logger.pend(
        'DEBUG',
        `Request ID verification skipped for Request:${apiCall.id} as it has status:${apiCall.status}`
      );
      return [[log], apiCall];
    }

    const expectedRequestId = getExpectedRequestId(apiCall);
    if (apiCall.id !== expectedRequestId) {
      const log = logger.pend('ERROR', `Invalid ID for Request:${apiCall.id}. Expected:${expectedRequestId}`);
      const updatedApiCall: Request<ApiCall> = {
        ...apiCall,
        status: RequestStatus.Ignored,
        errorMessage: `${RequestErrorMessage.RequestIdInvalid}: ${apiCall.id}`,
      };
      return [[log], updatedApiCall];
    }

    const log = logger.pend('DEBUG', `Request ID:${apiCall.id} has a valid ID`);
    return [[log], apiCall];
  });

  const logs = flatMap(logsWithVerifiedApiCalls, (r) => r[0]);
  const verifiedApiCalls = flatMap(logsWithVerifiedApiCalls, (r) => r[1]);
  return [logs, verifiedApiCalls];
}
