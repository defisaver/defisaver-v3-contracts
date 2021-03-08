const { expect } = require("chai");

const { getAssetInfo } = require("@defisaver/tokens");

const {
    getProxy,
    redeploy,
    balanceOf,
} = require("../utils");

const { getPair } = require("../utils-uni.js");

const { uniSupply, uniWithdraw } = require("../actions.js");

describe("Uni-Withdraw", function () {
    this.timeout(80000);

    let senderAcc, proxy;

    const uniPairs = [
        { tokenA: "ETH", tokenB: "DAI", amount: "1" },
        { tokenA: "ETH", tokenB: "WBTC", amount: "1" },
        { tokenA: "DAI", tokenB: "USDC", amount: "500" },
    ];

    before(async () => {
        await redeploy("UniWithdraw");

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

    });

    for (let i = 0; i < uniPairs.length; ++i) {
        it(`... should withdraw ${uniPairs[i].tokenA}/${uniPairs[i].tokenB} from uniswap`, async () => {
            const tokenDataA = getAssetInfo(uniPairs[i].tokenA);
            const tokenDataB = getAssetInfo(uniPairs[i].tokenB);

            const to = senderAcc.address;
            const from = senderAcc.address;

            const pairData = await getPair(tokenDataA.address, tokenDataB.address);

            let liquidity = await balanceOf(pairData.pairAddr, senderAcc.address);

            // if we don't have liq. we supply first
            if (liquidity.eq("0")) {
                await uniSupply(proxy, tokenDataA.address, tokenDataA.decimals, tokenDataB.address, uniPairs[i].amount, from, to);
                liquidity = await balanceOf(pairData.pairAddr, senderAcc.address);
            }

            const tokenABalanceBefore = await balanceOf(tokenDataA.address, senderAcc.address);
            const tokenBBalanceBefore = await balanceOf(tokenDataB.address, senderAcc.address);

            await uniWithdraw(proxy, tokenDataA.address, tokenDataB.address, pairData.pairAddr, liquidity, to, from);

            const tokenABalanceAfter = await balanceOf(tokenDataA.address, senderAcc.address);
            const tokenBBalanceAfter = await balanceOf(tokenDataB.address, senderAcc.address);
            const lpBalanceAfter = await balanceOf(pairData.pairAddr, senderAcc.address);

            expect(lpBalanceAfter).to.be.eq(0, "Should withdraw all the lp tokens");
            expect(tokenABalanceBefore).to.be.lt(tokenABalanceAfter);
            expect(tokenBBalanceBefore).to.be.lt(tokenBBalanceAfter);

        });
    }
});
