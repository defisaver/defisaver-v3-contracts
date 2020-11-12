const { expect } = require("chai");

const { getAssetInfo, mcdCollateralAssets, ilkToJoinMap } = require('defisaver-tokens');

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
} = require('../utils-mcd');

const {
    openMcd,
} = require('../actions.js');

describe("Mcd-Boost", function() {

    let makerAddresses, senderAcc, proxy, mcdOpenAddr;

    before(async () => {
        await redeploy('McdOpen');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        mcdOpenAddr = await getAddrFromRegistry('McdOpen');
    });


    it(`... should call a boost on a vault`, async () => {
        // create a vault

        // generate dai
        // sell
        // supply coll

        // string memory _name,
        // bytes[][] memory _actionsCallData,
        // bytes[][] memory _actionSubData,
        // uint8[][] memory _paramMapping,
        // bytes32[] memory _actionIds

        await proxy['execute(address,bytes)'](actionManagerAddr, functionData, { gasLimit: 2000000});
    });

});