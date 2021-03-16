const { expect } = require("chai");

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    approve,
    send,
    nullAddress,
    WETH_ADDRESS,
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

    });

    for (let i = 0; i < ilks.length; ++i) {
        const ilkData = ilks[i];
        const joinAddr = ilkData.join;
        const tokenData = getAssetInfo(ilkData.asset);

        it(`... should supply ${standardAmounts[tokenData.symbol]} ${tokenData.symbol} to a ${ilkData.ilkLabel} vault`, async () => {

            // skip uni tokens
            if (tokenData.symbol.indexOf("UNIV2") !== -1) {
                expect(true).to.be.true;
                return;
            }

            const vaultId = await openMcd(proxy, makerAddresses, joinAddr);
            const amount = BigNumber.from(ethers.utils.parseUnits(standardAmounts[tokenData.symbol], tokenData.decimals));

            const from = senderAcc.address;

            if (tokenData.symbol === 'ETH') {
                tokenData.address = WETH_ADDRESS;
            }

            await supplyMcd(proxy, vaultId, amount, tokenData.address, joinAddr, from);
        });

    }

});
