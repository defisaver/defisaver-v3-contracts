const { expect } = require("chai");

const { getAssetInfo, ilks, } = require('defisaver-tokens');

const dfs = require('defisaver-sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    nullAddress,
    REGISTRY_ADDR,
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
} = require('../utils-mcd');

describe("Aave-Supply", function() {

    let makerAddresses, senderAcc, proxy, mcdOpenAddr, mcdView;

    before(async () => {
        await redeploy('AaveSupply');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

    });

    it(`... should supply a token to aave`, async () => {
        
    });
});
