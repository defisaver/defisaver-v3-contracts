const { expect } = require("chai");

const { getAssetInfo, ilks } = require('defisaver-tokens');

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
    encodeMcdSupplyAction,
    buyGasTokens
} = require('../actions.js');

const BigNumber = hre.ethers.BigNumber;


describe("Mcd-Supply", function() {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy;

    before(async () => {
        await redeploy('McdSupply');
        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        // await buyGasTokens(proxy, senderAcc);
    });

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);

        it(`... should supply ${standardAmounts[tokenData.symbol]} ${tokenData.symbol} to a ${ilkData.ilkLabel} vault`, async () => {

            const vaultId = await openMcd(proxy, makerAddresses, joinAddr);
            const amount = BigNumber.from(ethers.utils.parseUnits(standardAmounts[tokenData.symbol], tokenData.decimals));

            const from = senderAcc.address;

            await supplyMcd(proxy, vaultId, amount, tokenData.address, joinAddr, from);
        });

    }

});
