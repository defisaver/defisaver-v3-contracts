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

    let makerAddresses, senderAcc, proxy;

    before(async () => {
        await redeploy('McdSupply');
        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        this.timeout(40000);

        // await buyGasTokens(proxy, senderAcc);
    });

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);

        it(`... should supply ${standardAmounts[tokenData.symbol]} ${tokenData.symbol} to a ${ilkData.ilkLabel} vault`, async () => {
            this.timeout(40000);

            const vaultId = await openMcd(proxy, makerAddresses, joinAddr);
            const amount = BigNumber.from(ethers.utils.parseUnits(standardAmounts[tokenData.symbol], tokenData.decimals));

            const from = senderAcc.address;

           await supplyMcd(proxy, tokenData.symbol, tokenData.address, vaultId, amount, joinAddr, from);
        });

    }

});
