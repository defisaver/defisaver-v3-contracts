const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    standardAmounts,
    dydxTokens,
    send,
} = require('../utils');

const {
    dydxSupply,
    buyTokenIfNeeded,
} = require('../actions.js');

describe('DyDx-Supply', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let dydxView;

    before(async () => {
        await redeploy('DyDxSupply');
        dydxView = await redeploy('DyDxView');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });

    for (let i = 0; i < dydxTokens.length; ++i) {
        const assetInfo = getAssetInfo(dydxTokens[i]);

        const standardAmount = hre.ethers.utils.parseUnits(
            standardAmounts[assetInfo.symbol],
            assetInfo.decimals,
        );

        const tokenAddr = assetInfo.address;

        it(`... should supply standard amount of ${dydxTokens[i]} to DyDx`, async () => {
            const supplyBefore = await dydxView.getSupplyBalance(proxy.address, tokenAddr);

            await buyTokenIfNeeded(tokenAddr, senderAcc, proxy, standardAmount);

            const token = await hre.ethers.getContractAt('IERC20', tokenAddr);

            // eslint-disable-next-line max-len
            await expect(() => dydxSupply(proxy, tokenAddr, standardAmount, senderAcc.address))
                .to.changeTokenBalance(token, senderAcc, standardAmount.mul(-1));

            const supplyAfter = await dydxView.getSupplyBalance(proxy.address, tokenAddr);

            // is not exact, as dydx increments the amount by a few wei
            expect(supplyAfter).to.be.least(supplyBefore.add(standardAmount).sub(1));
        });

        it(`... should supply max.uint amount from proxy ${dydxTokens[i]} to DyDx`, async () => {
            const amount = hre.ethers.constants.MaxUint256;

            const supplyBefore = await dydxView.getSupplyBalance(proxy.address, tokenAddr);

            await buyTokenIfNeeded(tokenAddr, senderAcc, proxy, standardAmount);

            await send(tokenAddr, proxy.address, standardAmount);

            const token = await hre.ethers.getContractAt('IERC20', tokenAddr);

            await expect(() => dydxSupply(proxy, tokenAddr, amount, proxy.address))
                .to.changeTokenBalance(token, proxy, standardAmount.mul(-1));

            const supplyAfter = await dydxView.getSupplyBalance(proxy.address, tokenAddr);

            expect(supplyAfter).to.be.least(supplyBefore.add(standardAmount));
        });
    }
});
