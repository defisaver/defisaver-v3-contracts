/* eslint-disable class-methods-use-this */
/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');
const automationSdk = require('@defisaver/automation-sdk');
const { getAssetInfo } = require('@defisaver/tokens');
const { getLiquityV2TestPairs, deployLiquityV2CloseBundle } = require('../../utils-liquityV2');
const { BaseLiquityV2StrategyTest } = require('./common');
const { subLiquityV2CloseBundle } = require('../../strategy-subs');
const {
    formatExchangeObjSdk, BOLD_ADDR, addrs, network, isNetworkFork,
    balanceOf,
    WETH_ADDRESS,
    ETH_ADDR,
    BALANCER_VAULT_ADDR,
    setBalance,
    fetchAmountInUSDPrice,
} = require('../../utils');
const { callLiquityV2CloseToCollStrategy, callLiquityV2FLCloseToCollStrategy, callLiquityV2FLCloseToDebtStrategy } = require('../../strategy-calls');

class CloseTest extends BaseLiquityV2StrategyTest {
    async setUp() {
        await this.baseSetUp();
        this.bundles.close = await deployLiquityV2CloseBundle(this.proxy, this.isFork);
    }

    // This will hold for safe 1/1 wallets which we are testing here. For multisig, leftover will stay on the wallet
    async assertNothingLeftOnWallet(collToken) {
        const proxyCollBalanceAfter = await balanceOf(collToken, this.proxy.address);
        const proxyBoldBalanceAfter = await balanceOf(BOLD_ADDR, this.proxy.address);
        const proxyWethBalanceAfter = await balanceOf(WETH_ADDRESS, this.proxy.address);
        const proxyEthBalanceAfter = await balanceOf(ETH_ADDR, this.proxy.address);

        expect(proxyCollBalanceAfter).to.be.eq(0);
        expect(proxyBoldBalanceAfter).to.be.eq(0);
        expect(proxyWethBalanceAfter).to.be.eq(0);
        expect(proxyEthBalanceAfter).to.be.eq(0);
    }

    async assertTroveClosed(troveInfoAfter) {
        expect(troveInfoAfter.collAmount).to.be.eq(0);
        expect(troveInfoAfter.debtAmount).to.be.eq(0);
        expect(troveInfoAfter.owner).to.be.eq(hre.ethers.constants.AddressZero);
        expect(troveInfoAfter.status).to.be.eq(2); // closed by owner status
    }

    async assertEoaBalances(collAsset, stateBefore, stateAfter) {
        if (collAsset.symbol === 'WETH') {
            expect(stateAfter.eoaEthBalance).to.be.gt(
                stateBefore.eoaEthBalance
                    .add(hre.ethers.utils.parseEther('0.0375'))
                    .add(stateBefore.troveInfo.collAmount.mul(8).div(10)),
            );
        } else {
            expect(stateAfter.eoaEthBalance).to.be.eq(
                stateBefore.eoaEthBalance.add(hre.ethers.utils.parseEther('0.0375')),
            );
            expect(stateAfter.eoaCollBalance).to.be.gt(
                stateBefore.eoaCollBalance.add(stateBefore.troveInfo.collAmount.mul(9).div(10)),
            );
        }
    }

    async assert(collAsset, stateBefore, stateAfter) {
        this.assertNothingLeftOnWallet(collAsset.address);
        this.assertTroveClosed(stateAfter.troveInfo);
        this.assertEoaBalances(collAsset, stateBefore, stateAfter);
    }

    async subCloseBundle(market, troveId, collToken) {
        const stopLossPrice = 0;
        const stopLossType = automationSdk.enums.CloseToAssetType.COLLATERAL;
        const takeProfitPrice = 2000;
        const takeProfitType = automationSdk.enums.CloseToAssetType.COLLATERAL;

        const { subId, strategySub } = await subLiquityV2CloseBundle(
            this.proxy,
            market,
            troveId,
            collToken,
            stopLossPrice,
            stopLossType,
            takeProfitPrice,
            takeProfitType,
            this.bundles.close,
        );
        return { subId, strategySub };
    }

    runTests() {
        // eslint-disable-next-line no-unused-vars
        this.testPairs.forEach((pair, i) => {
            it('... should call LiquityV2 close to collateral strategy', async () => {
                const collAsset = getAssetInfo(pair.supplyTokenSymbol);

                const supplyAmount = await fetchAmountInUSDPrice(collAsset.symbol, '30000');
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount);
                console.log('troveId', troveId);

                const { subId, strategySub } = await this.subCloseBundle(pair.market, troveId, collAsset.address);

                const stateBefore = {
                    troveInfo: await this.contracts.view.getTroveInfo(pair.market, troveId),
                    eoaCollBalance: await balanceOf(collAsset.address, this.senderAcc.address),
                    eoaEthBalance: await balanceOf(ETH_ADDR, this.senderAcc.address),
                };

                const withdrawCollAmount = stateBefore.troveInfo.collAmount.div(10);

                const exchangeObject = await formatExchangeObjSdk(
                    collAsset.address,
                    BOLD_ADDR,
                    withdrawCollAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    false,
                    true,
                );

                await callLiquityV2CloseToCollStrategy(
                    this.contracts.strategyExecutor,
                    0,
                    subId,
                    strategySub,
                    exchangeObject,
                    withdrawCollAmount,
                );

                const stateAfter = {
                    troveInfo: await this.contracts.view.getTroveInfo(pair.market, troveId),
                    eoaCollBalance: await balanceOf(collAsset.address, this.senderAcc.address),
                    eoaEthBalance: await balanceOf(ETH_ADDR, this.senderAcc.address),
                };

                this.assert(collAsset, stateBefore, stateAfter);
            });
            it('... should call LiquityV2 fl close to collateral strategy', async () => {
                const collAsset = getAssetInfo(pair.supplyTokenSymbol);

                const supplyAmount = await fetchAmountInUSDPrice(collAsset.symbol, '30000');
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount);
                console.log('troveId', troveId);

                const { subId, strategySub } = await this.subCloseBundle(pair.market, troveId, collAsset.address);

                const stateBefore = {
                    troveInfo: await this.contracts.view.getTroveInfo(pair.market, troveId),
                    eoaCollBalance: await balanceOf(collAsset.address, this.senderAcc.address),
                    eoaEthBalance: await balanceOf(ETH_ADDR, this.senderAcc.address),
                };

                const flCollAmount = stateBefore.troveInfo.collAmount.div(10);

                const exchangeObject = await formatExchangeObjSdk(
                    collAsset.address,
                    BOLD_ADDR,
                    flCollAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    false,
                    true,
                );

                await callLiquityV2FLCloseToCollStrategy(
                    this.contracts.strategyExecutor,
                    1,
                    subId,
                    strategySub,
                    exchangeObject,
                    flCollAmount,
                    this.contracts.flAction.address,
                    collAsset.address,
                );

                const stateAfter = {
                    troveInfo: await this.contracts.view.getTroveInfo(pair.market, troveId),
                    eoaCollBalance: await balanceOf(collAsset.address, this.senderAcc.address),
                    eoaEthBalance: await balanceOf(ETH_ADDR, this.senderAcc.address),
                };

                this.assert(collAsset, stateBefore, stateAfter);
            });
            it('... should call LiquityV2 fl close to debt strategy', async () => {
                const collAsset = getAssetInfo(pair.supplyTokenSymbol);

                const supplyAmount = await fetchAmountInUSDPrice(collAsset.symbol, '30000');
                const boldAmount = hre.ethers.utils.parseUnits('15000', 18);
                const troveId = await this.openTrove(pair, supplyAmount, boldAmount);
                console.log('troveId', troveId);

                const { subId, strategySub } = await this.subCloseBundle(pair.market, troveId, collAsset.address);

                const stateBefore = {
                    troveInfo: await this.contracts.view.getTroveInfo(pair.market, troveId),
                    eoaCollBalance: await balanceOf(collAsset.address, this.senderAcc.address),
                    eoaEthBalance: await balanceOf(ETH_ADDR, this.senderAcc.address),
                };

                const exchangeObject = await formatExchangeObjSdk(
                    collAsset.address,
                    BOLD_ADDR,
                    stateBefore.troveInfo.collAmount,
                    addrs[network].UNISWAP_V3_WRAPPER,
                    false,
                    true,
                );

                const flBoldAmount = stateBefore.troveInfo.debtAmount.mul(10).div(8);

                // add bold liquidity to balancer vault so we can use balancer flashloan
                await setBalance(BOLD_ADDR, BALANCER_VAULT_ADDR, flBoldAmount);

                await callLiquityV2FLCloseToDebtStrategy(
                    this.contracts.strategyExecutor,
                    2,
                    subId,
                    strategySub,
                    exchangeObject,
                    flBoldAmount,
                    this.contracts.flAction.address,
                );

                const stateAfter = {
                    troveInfo: await this.contracts.view.getTroveInfo(pair.market, troveId),
                    eoaCollBalance: await balanceOf(collAsset.address, this.senderAcc.address),
                    eoaEthBalance: await balanceOf(ETH_ADDR, this.senderAcc.address),
                };

                this.assert(collAsset, stateBefore, stateAfter);
            });
        });
    }
}

module.exports = async function runCloseTests() {
    const testPairs = await getLiquityV2TestPairs();
    const isFork = isNetworkFork();
    const closeTest = new CloseTest(testPairs, isFork);
    describe('LiquityV2 Close Strategy Tests', function () {
        this.timeout(1200000);
        before(async () => { await closeTest.setUp(); });
        beforeEach(async () => { await closeTest.takeSnapshot(); });
        afterEach(async () => { await closeTest.revertToSnapshot(); });
        closeTest.runTests();
    });
};
