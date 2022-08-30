/* eslint-disable no-await-in-loop */
const { getAssetInfoByAddress } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');

const { supplyCompV3 } = require('../actions');
const {
    redeploy,
    USDC_ADDR,
    fetchAmountinUSDPrice,
    getProxy,
    getAddrFromRegistry,
} = require('../utils');

const { getSupportedAssets, COMET_ADDR } = require('../utils-compV3');

describe('CompV3-Supply', async function () {
    this.timeout(80000);

    let senderAcc;
    let proxy;
    let compV3View;
    let comet;

    before(async () => {
        await redeploy('CompV3Supply');
        await redeploy('CompV3View');

        const compV3ViewAddr = await getAddrFromRegistry('CompV3View');
        compV3View = await hre.ethers.getContractAt('CompV3View', compV3ViewAddr);

        comet = await hre.ethers.getContractAt('IComet', COMET_ADDR);

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    it('should supply all supported assets to CompoundV3', async () => {
        const tokens = await getSupportedAssets(compV3View);
        for (let i = 0; i < tokens.length; i++) {
            const token = getAssetInfoByAddress(tokens[i].asset);

            const fetchedAmountWithUSD = fetchAmountinUSDPrice(token.symbol, '10000');
            const amount = hre.ethers.utils.parseUnits(
                fetchedAmountWithUSD,
                token.decimals,
            );

            const balanceBefore = await comet.balanceOf(proxy.address);

            await supplyCompV3(proxy, USDC_ADDR, amount, senderAcc.address);

            const balanceAfter = await comet.balanceOf(proxy.address);

            expect(balanceAfter).to.be.gt(balanceBefore);
        }
    });
});
