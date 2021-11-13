import * as adapter from '@api3/airnode-adapter';
import { ReservedParameterName } from '@api3/airnode-ois';
import { callApi } from './call-api';
import { RequestErrorMessage } from '../types';
import * as fixtures from '../../test/fixtures';

describe('callApi', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('calls the adapter with the given parameters', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'price', from: 'ETH' };
    const aggregatedApiCall = fixtures.buildAggregatedApiCall({ parameters });
    const [logs, res] = await callApi({
      config: fixtures.buildConfig(),
      aggregatedApiCall,
      apiCallOptions: {},
    });
    expect(logs).toEqual([]);
    expect(res).toEqual({ value: '0x0000000000000000000000000000000000000000000000000000000005f5e100' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      {
        endpointName: 'convertToUSD',
        ois: fixtures.buildOIS(),
        parameters: { from: 'ETH' },
        metadataParameters: {},
        apiCredentials: [
          {
            securitySchemeName: 'My Security Scheme',
            securitySchemeValue: 'supersecret',
          },
        ],
      },
      { timeout: 20000 }
    );
  });

  describe('with _relay_metadata set', () => {
    it.each([
      ['Includes', 'v1', true, undefined],
      ['Includes', 'V1', true, undefined],
      ['Includes', 'v2', false, { default: 'v1' }],
      ['Includes', 'v2', true, { fixed: 'v1' }],
      ['Does not include', 'version1', false, undefined],
      ['Does not include', '1', false, undefined],
      ['Does not include', '', false, undefined],
      ['Does not include', 'false', false, undefined],
      ['Does not include', undefined, false, undefined],
      ['Does not include', undefined, false, { default: '' }],
      ['Does not include', undefined, true, { default: 'v1' }],
    ])(
      '%s Airnode metadata when _relay_metadata is set to: %s',
      async (_, _relay_metadata, expectMetadata, parameterOptions) => {
        const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
        spy.mockResolvedValueOnce({ data: { price: 1000 } });
        const ois = fixtures.buildOIS();
        ois.endpoints[0].reservedParameters.push({
          name: ReservedParameterName.RelayMetadata,
          ...(parameterOptions ?? {}),
        });
        const config = fixtures.buildConfig({ ois: [ois] });
        const parameters = { _type: 'int256', _path: 'price', from: 'ETH', _relay_metadata };
        const aggregatedApiCall = fixtures.buildAggregatedApiCall({ parameters } as any);
        const [logs, res] = await callApi({ config, aggregatedApiCall, apiCallOptions: {} });
        expect(logs).toEqual([]);
        expect(res).toEqual({ value: '0x0000000000000000000000000000000000000000000000000000000005f5e100' });
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(
          {
            endpointName: 'convertToUSD',
            metadataParameters: {
              ...(expectMetadata && {
                _airnode_airnode_address: aggregatedApiCall.airnodeAddress,
                _airnode_requester_address: aggregatedApiCall.requesterAddress,
                _airnode_sponsor_wallet_address: aggregatedApiCall.sponsorWalletAddress,
                _airnode_endpoint_id: aggregatedApiCall.endpointId,
                _airnode_sponsor_address: aggregatedApiCall.sponsorAddress,
                _airnode_request_id: aggregatedApiCall.id,
                _airnode_chain_id: aggregatedApiCall.chainId,
                _airnode_chain_type: config.chains[0].type,
                _airnode_airnode_rrp: config.chains[0].contracts.AirnodeRrp,
              }),
            },
            ois,
            parameters: {
              from: 'ETH',
            },
            apiCredentials: [
              {
                securitySchemeName: 'My Security Scheme',
                securitySchemeValue: 'supersecret',
              },
            ],
          },
          { timeout: 20000 }
        );
      }
    );
  });

  it('returns an error if no _type parameter is found', async () => {
    const aggregatedApiCall = fixtures.buildAggregatedApiCall();
    const [logs, res] = await callApi({ config: fixtures.buildConfig(), aggregatedApiCall, apiCallOptions: {} });
    expect(logs).toEqual([
      {
        level: 'ERROR',
        message: "No '_type' parameter was found for Endpoint:convertToUSD, OIS:Currency Converter API",
      },
    ]);
    expect(res).toEqual({
      errorMessage: `${RequestErrorMessage.ReservedParametersInvalid}: _type is missing for endpoint convertToUSD`,
    });
  });

  it('returns an error if the API call fails to execute', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockRejectedValueOnce(new Error('Network is down'));

    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedApiCall = fixtures.buildAggregatedApiCall({ parameters });
    const [logs, res] = await callApi({ config: fixtures.buildConfig(), aggregatedApiCall, apiCallOptions: {} });
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Failed to call Endpoint:convertToUSD', error: new Error('Network is down') },
    ]);
    expect(res).toEqual({
      errorMessage: `${RequestErrorMessage.ApiCallFailed} with error: Network is down`,
    });
  });

  it('returns an error if the value cannot be found with the _path', async () => {
    const spy = jest.spyOn(adapter, 'buildAndExecuteRequest') as any;
    spy.mockResolvedValueOnce({ data: { price: 1000 } });
    const parameters = { _type: 'int256', _path: 'unknown', from: 'ETH' };
    const aggregatedApiCall = fixtures.buildAggregatedApiCall({ parameters });
    const [logs, res] = await callApi({ config: fixtures.buildConfig(), aggregatedApiCall, apiCallOptions: {} });
    expect(logs).toEqual([
      { level: 'ERROR', message: 'Unable to find response value from {"price":1000}. Path: unknown' },
    ]);
    expect(res).toEqual({
      errorMessage: RequestErrorMessage.ResponseValueNotFound,
    });
  });
});
