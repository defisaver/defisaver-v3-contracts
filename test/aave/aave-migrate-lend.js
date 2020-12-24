const { expect } = require("chai");

const dfs = require("defisaver-sdk");

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    balanceOf,
    ETH_ADDR,
    UNISWAP_WRAPPER,
    MAX_UINT,
    approve,
} = require("../utils");

const { sell } = require("../actions");

describe("Aave-Migrate-Lend", function () {
    this.timeout(80000);

    const LEND_ADDR = "0x80fB784B7eD66730e8b1DBd9820aFD29931aab03";
    const AAVE_ADDR = "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9";

    let senderAcc, proxy, aaveMigrateLendAddr;

    before(async () => {
        await redeploy("AaveMigrateLend");
        await redeploy("DFSSell");

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        aaveMigrateLendAddr = getAddrFromRegistry('AaveMigrateLend');
    });

    it(`... should migrate Lend -> Aave`, async () => {
        let useMax = true;
        let lendAmount = ethers.utils.parseUnits("520", 18);

        const lendBalance = await balanceOf(LEND_ADDR, senderAcc.address);

        if (useMax) {
            lendAmount = MAX_UINT;
        }

        if (lendBalance.lt(lendAmount)) {
            await sell(
                proxy,
                ETH_ADDR,
                LEND_ADDR,
                ethers.utils.parseUnits("5", 18),
                UNISWAP_WRAPPER,
                senderAcc.address,
                senderAcc.address
            );
        }

        const migrateAction = new dfs.actions.aave.AaveMigrateLendAction(
            lendAmount, senderAcc.address, senderAcc.address
        );

        const functionData = migrateAction.encodeForDsProxyCall()[1];

        const aaveBalanceBefore = await balanceOf(AAVE_ADDR, senderAcc.address);
        const aaveProxyBalanceBefore = await balanceOf(AAVE_ADDR, proxy.address);
        const lendProxyBalanceBefore = await balanceOf(LEND_ADDR, proxy.address);

        await approve(LEND_ADDR, proxy.address);

        await proxy['execute(address,bytes)'](aaveMigrateLendAddr, functionData, {gasLimit: 3000000});

        const aaveBalanceAfter = await balanceOf(AAVE_ADDR, senderAcc.address);
        console.log('Aave before', aaveBalanceBefore / 1e18, 'Aave after: ', aaveBalanceAfter / 1e18);

        const aaveProxyBalanceAfter = await balanceOf(AAVE_ADDR, proxy.address);
        const lendProxyBalanceAfter = await balanceOf(LEND_ADDR, proxy.address);

        expect(aaveBalanceAfter).to.be.gt(aaveBalanceBefore);
        expect(aaveProxyBalanceAfter).to.be.eq(aaveProxyBalanceBefore);
        expect(lendProxyBalanceAfter).to.be.eq(lendProxyBalanceBefore);
    });
});
