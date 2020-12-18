const { expect } = require("chai");

const { getAssetInfo, compoundCollateralAssets } = require('defisaver-tokens');

const dfs = require('defisaver-sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    balanceOf,
    isEth,
    standardAmounts,
    nullAddress,
    REGISTRY_ADDR,
    ETH_ADDR,
    WETH_ADDRESS
} = require('../utils');


const {
    supplyComp,
} = require('../actions');

describe("Comp-Supply", function () {
    this.timeout(80000);

    let senderAcc, proxy, compSupplyAddr, tokensInAave, dataProvider;

    before(async () => {
        await redeploy('CompSupply');
        await redeploy('DFSSell');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        compSupplyAddr = getAddrFromRegistry('CompSupply');
    });

    for (let i = 0; i < compoundCollateralAssets.length; ++i) {
        const cTokenData = compoundCollateralAssets[i];

        it(`... should supply ${standardAmounts[cTokenData.underlyingAsset]} ${cTokenData.underlyingAsset} to Compound`, async () => {
            const assetInfo = getAssetInfo(cTokenData.underlyingAsset);
            const cToken = cTokenData.address;

            if (assetInfo.symbol === 'REP') return;

            const amount = ethers.utils.parseUnits(standardAmounts[assetInfo.symbol], assetInfo.decimals);
    
            const balanceBefore = await balanceOf(cToken, proxy.address);

            await supplyComp(proxy, cToken, amount, senderAcc.address);
    
            const balanceAfter = await balanceOf(cToken, proxy.address);
    
            expect(balanceAfter).to.be.gt(balanceBefore);
        
        });
    }

});

