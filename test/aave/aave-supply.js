const { expect } = require("chai");

const { getAssetInfo, ilks, } = require('defisaver-tokens');

const dfs = require('defisaver-sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    balanceOf,
    nullAddress,
    REGISTRY_ADDR,
    ETH_ADDR,
    AAVE_MARKET
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
} = require('../utils-mcd');
const { experimentalAddHardhatNetworkMessageTraceHook } = require("hardhat/config");

describe("Aave-Supply", function() {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, aaveSupplyAddr, mcdView;

    before(async () => {
        await redeploy('AaveSupply');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        aaveSupplyAddr = getAddrFromRegistry('AaveSupply');
        const dataProvider = await 
    hre.ethers.getContractAt("IAaveProtocolDataProviderV2", "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d");

        const tokens = await dataProvider.getAllReservesTokens();
        console.log(tokens);

    });

    it(`... should supply a ETH to aave`, async () => {

        const A_ETH_ADDR = '0x030bA81f1c18d280636F32af80b9AAd02Cf0854e';

        const amount = ethers.utils.parseUnits('1', 18);
        const value = amount;

        const balanceBefore = await balanceOf(A_ETH_ADDR, proxy.address);

        const mcdSupplyAction = new dfs.Action(
            "AaveSupply",
            "0x0",
            ["address", "address", "uint256", "address"], 
            [AAVE_MARKET, ETH_ADDR, amount, senderAcc.address]
        );
        const functionData = mcdSupplyAction.encodeForDsProxyCall()[1];

       await proxy['execute(address,bytes)'](aaveSupplyAddr, functionData, {value, gasLimit: 3000000});

       const balanceAfter = await balanceOf(A_ETH_ADDR, proxy.address);

       expect(balanceAfter).to.be.gt(balanceBefore);

    });
});

