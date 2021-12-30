/* eslint-disable no-await-in-loop */
const { expect } = require('chai');
const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    depositToWeth,
    approve,
    WETH_ADDRESS,
    MAX_UINT128,
    LOGGER_ADDR,
    UNIV3ROUTER_ADDR,
    UNIV3POSITIONMANAGER_ADDR,
    fetchAmountinUSDPrice,
} = require('../../utils');

const {
    uniV3Mint,
    uniV3Collect,
} = require('../../actions.js');
const { uniV3CollectTest } = require('./univ3-tests');

describe('Uni-Mint-V3', () => {
    before(async () => {
        await redeploy('UniMintV3');
        await redeploy('UniSupplyV3');
        await redeploy('UniCollectV3');
    });

    it('... should only collect tokens owed from position on uniswap V3', async () => {
        await uniV3CollectTest();
    }).timeout(50000);
});
