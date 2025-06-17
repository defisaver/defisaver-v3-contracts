const hre = require('hardhat');
const { configure } = require('@defisaver/sdk');
const { topUp } = require('../../../scripts/utils/fork');
const {
    getProxy,
    addrs,
    getContractFromRegistry,
    getOwnerAddr,
    takeSnapshot,
    revertToSnapshot,
    redeploy,
    setBalance,
    approve,
    chainIds,
    setNewExchangeWrapper,
    network,
} = require('../../utils/utils');
const { addBotCaller } = require('../utils/utils-strategies');
const { fluidT1VaultOpen } = require('../../utils/actions');

class BaseFluidT1StrategyTest {
    constructor(testPairs, isFork) {
        this.testPairs = testPairs;
        this.isFork = isFork;
        this.snapshotId = null;
        this.contracts = {};
        this.bundles = {};
    }

    async baseSetUp() {
        console.log('isFork', this.isFork);

        configure({
            chainId: chainIds[network],
            testMode: true,
        });

        await this.setUpCallers();
        await this.setUpContracts();
        await addBotCaller(this.botAcc.address, this.isFork);
    }

    async takeSnapshot() {
        this.snapshotId = await takeSnapshot();
    }

    async revertToSnapshot() {
        await revertToSnapshot(this.snapshotId);
    }

    async setUpCallers() {
        this.senderAcc = (await hre.ethers.getSigners())[0];
        this.botAcc = (await hre.ethers.getSigners())[1];

        if (this.isFork) {
            await topUp(this.senderAcc.address);
            await topUp(this.botAcc.address);
            await topUp(getOwnerAddr());
        }

        this.proxy = await getProxy(this.senderAcc.address, hre.config.isWalletSafe);
        this.proxy = this.proxy.connect(this.senderAcc);
    }

    async setUpContracts() {
        const strategyContractName = network === 'mainnet' ? 'StrategyExecutor' : 'StrategyExecutorL2';
        const strategyExecutor = await hre.ethers.getContractAt(
            strategyContractName, addrs[network].STRATEGY_EXECUTOR_ADDR,
        );
        this.contracts.strategyExecutor = strategyExecutor.connect(this.botAcc);
        this.contracts.flAction = await getContractFromRegistry('FLAction', this.isFork);
        this.contracts.view = await redeploy('FluidView', this.isFork);
        await redeploy('FluidVaultT1Open', this.isFork);
        await redeploy('FluidRatioCheck', this.isFork);
        await redeploy('FluidVaultT1Borrow', this.isFork);
        await redeploy('FluidVaultT1Supply', this.isFork);
        await redeploy('FluidRatioTrigger', this.isFork);
        await redeploy('FluidVaultT1Adjust', this.isFork);
        await redeploy('FluidVaultT1Withdraw', this.isFork);
        await redeploy('FluidVaultT1Payback', this.isFork);
        const mockExchangeName = network === 'mainnet' ? 'MockExchangeWrapperUsdFeed' : 'MockExchangeWrapperUsdFeedL2';
        this.contracts.mockWrapper = await redeploy(
            mockExchangeName, this.isFork,
        );
        await setNewExchangeWrapper(this.senderAcc, this.contracts.mockWrapper.address);
    }

    async openVault(vault, collToken, collAmount, debtAmount) {
        await setBalance(collToken, this.senderAcc.address, collAmount);
        await approve(collToken, this.proxy.address, this.senderAcc);

        await fluidT1VaultOpen(
            this.proxy,
            vault,
            collAmount,
            debtAmount,
            this.senderAcc.address,
            this.senderAcc.address,
            true,
        );

        const fluidVaultT1Resolver = await hre.ethers.getContractAt(
            'IFluidVaultResolver',
            addrs[network].FLUID_VAULT_T1_RESOLVER_ADDR,
        );

        const nftIds = await fluidVaultT1Resolver.positionsNftIdOfUser(this.proxy.address);

        return nftIds[nftIds.length - 1];
    }

    async getRatio(nftId) {
        const positionData = await this.contracts.view.callStatic.getPositionByNftId(nftId);
        return positionData.position.ratio;
    }
}

module.exports = {
    BaseFluidT1StrategyTest,
};
