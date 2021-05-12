const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');

const {
    getProxy,
    redeploy,
    standardAmounts,
    dydxTokens,
    balanceOf,
} = require('../utils');

const {
    dydxSupply,
    dydxWithdraw,
    buyTokenIfNeeded,
} = require('../actions.js');

describe('DyDx-Withdraw', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let dydxView;

    before(async () => {
        await redeploy('DyDxWithdraw');
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

        it(`... should withdraw standard amount of ${dydxTokens[i]}`, async () => {
            // supply first
            await buyTokenIfNeeded(tokenAddr, senderAcc, proxy, standardAmount);
            await dydxSupply(proxy, tokenAddr, standardAmount, senderAcc.address);

            const supplyBefore = await dydxView.getSupplyBalance(senderAcc.address, tokenAddr);
            const token = await hre.ethers.getContractAt('IERC20', tokenAddr);

            // eslint-disable-next-line max-len
            await expect(() => dydxWithdraw(proxy, tokenAddr, standardAmount, senderAcc.address))
                .to.changeTokenBalance(token, senderAcc, standardAmount);

            const supplyAfter = await dydxView.getSupplyBalance(senderAcc.address, tokenAddr);

            // is not exact, as dydx increments the amount by a few wei
            expect(supplyAfter).to.be.least(supplyBefore.sub(standardAmount));
        });

        it(`... should withdraw max.uint amount ${dydxTokens[i]}`, async () => {
            // supply first
            await buyTokenIfNeeded(tokenAddr, senderAcc, proxy, standardAmount);
            await dydxSupply(proxy, tokenAddr, standardAmount, senderAcc.address);

            const amount = hre.ethers.constants.MaxUint256;

            const accBalanceBefore = await balanceOf(tokenAddr, senderAcc.address);

            // can't use changeTokenBalance as we have a few wei diff. between amount
            await dydxWithdraw(proxy, tokenAddr, amount, senderAcc.address);

            const accBalanceAfter = await balanceOf(tokenAddr, senderAcc.address);
            const supplyAfter = await dydxView.getSupplyBalance(proxy.address, tokenAddr);

            expect(accBalanceBefore).to.be.lt(accBalanceAfter);
            expect(supplyAfter).to.be.eq(hre.ethers.BigNumber.from(0));
        });
    }
});
