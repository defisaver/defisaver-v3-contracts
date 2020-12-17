const { expect } = require("chai");

const { getAssetInfo, ilks, } = require('defisaver-tokens');

const dfs = require('defisaver-sdk');

const {
    getAaveDataProvider,
    getAaveTokenInfo,
    getAaveReserveInfo,
    aaveV2assetsDefaultMarket
} = require('../utils-aave');

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
    AAVE_MARKET,
    WETH_ADDRESS
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
} = require('../utils-mcd');

const {
    supplyAave,
} = require('../actions');

describe("Aave-Supply", function () {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, aaveSupplyAddr, tokensInAave, dataProvider;

    before(async () => {
        await redeploy('AaveSupply');
        await redeploy('DFSSell');

        makerAddresses = await fetchMakerAddresses();

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        aaveSupplyAddr = getAddrFromRegistry('AaveSupply');
        dataProvider = await getAaveDataProvider();

        tokensInAave = await dataProvider.getAllReservesTokens();

    });

    for (let i = 0; i < aaveV2assetsDefaultMarket.length; ++i) {
        const tokenSymbol = aaveV2assetsDefaultMarket[i];

        it(`... should supply ${standardAmounts[tokenSymbol]} ${tokenSymbol} to Aave`, async () => {
            const assetInfo = getAssetInfo(tokenSymbol);

            let addr = assetInfo.address;

            if (isEth(addr)) {
                addr = WETH_ADDRESS;
            }

            const aaveTokenInfo = await getAaveTokenInfo(dataProvider, addr);
            const aToken = aaveTokenInfo.aTokenAddress;

            const amount = ethers.utils.parseUnits(standardAmounts[assetInfo.symbol], assetInfo.decimals);
    
            const balanceBefore = await balanceOf(aToken, proxy.address);

            await supplyAave(proxy, AAVE_MARKET, amount, assetInfo.address, senderAcc.address);
    
            const balanceAfter = await balanceOf(aToken, proxy.address);
    
            expect(balanceAfter).to.be.gt(balanceBefore);
        
        });
    }

});

