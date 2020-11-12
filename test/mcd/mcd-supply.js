const { expect } = require("chai");

const { getAssetInfo, mcdCollateralAssets, ilkToJoinMap } = require('defisaver-tokens');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    approve,
    send,
    nullAddress,
    REGISTRY_ADDR,
    standardAmounts,
    balanceOf,
} = require('../utils');

const {
    fetchMakerAddresses,
} = require('../utils-mcd.js');

const {
    openMcd,
    supplyMcd,
    sell,
    encodeMcdSupplyAction
} = require('../actions.js');

const BigNumber = hre.ethers.BigNumber;


describe("Mcd-Supply", function() {

    let makerAddresses, senderAcc, proxy;

    before(async () => {
        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        this.timeout(40000);
    });

    for (let i = 0; i < mcdCollateralAssets.length; ++i) {
        const tokenData = mcdCollateralAssets[i];

        it(`... should supply ${standardAmounts[tokenData.symbol]} ${tokenData.symbol} to a ${tokenData.ilkLabel} vault`, async () => {
            this.timeout(40000);

            const vaultId = await openMcd(proxy, makerAddresses, ilkToJoinMap[tokenData.ilk]);
            const amount = BigNumber.from(ethers.utils.parseUnits(standardAmounts[tokenData.symbol], tokenData.decimals));

            const joinAddr = ilkToJoinMap[tokenData.ilk];
            const from = senderAcc.address;

           await supplyMcd(proxy, tokenData.symbol, tokenData.address, vaultId, amount, joinAddr, from);
        });

    }

});