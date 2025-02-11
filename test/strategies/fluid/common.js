const hre = require('hardhat');
const { configure } = require('@defisaver/sdk');
const { topUp } = require('../../../scripts/utils/fork');
const {
    getProxy, addrs, getNetwork, getContractFromRegistry,
    getOwnerAddr,
    takeSnapshot,
    revertToSnapshot,
    redeploy,
    setBalance,
    approve,
    chainIds,
    setNewExchangeWrapper,
} = require('../../utils');
const { addBotCaller } = require('../../utils-strategies');
const { fluidT1VaultOpen } = require('../../actions');

class BaseFluidT1StrategyTest {
    constructor(testPairs, isFork) {
        this.testPairs = testPairs;
        this.isFork = isFork;
        this.snapshotId = null;
        this.contracts = {};
        this.bundles = {};
        this.registryAddr = addrs[getNetwork()].REGISTRY_ADDR;
    }

    async baseSetUp() {
        console.log('isFork', this.isFork);

        configure({
            chainId: chainIds[getNetwork()],
            testMode: true,
        });

        await this.setUpCallers();
        await this.setUpContracts();
        await addBotCaller(this.botAcc.address, this.registryAddr, this.isFork);
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
        const strategyExecutor = await hre.ethers.getContractAt('StrategyExecutor', addrs[getNetwork()].STRATEGY_EXECUTOR_ADDR);
        this.contracts.strategyExecutor = strategyExecutor.connect(this.botAcc);
        this.contracts.flAction = await getContractFromRegistry('FLAction', this.registryAddr, false, this.isFork);
        this.contracts.view = await redeploy('FluidView', this.registryAddr, false, this.isFork);
        await redeploy('FluidVaultT1Open', this.registryAddr, false, this.isFork);
        await redeploy('FluidRatioCheck', this.registryAddr, false, this.isFork);
        await redeploy('FluidVaultT1Borrow', this.registryAddr, false, this.isFork);
        await redeploy('FluidVaultT1Supply', this.registryAddr, false, this.isFork);
        await redeploy('FluidRatioTrigger', this.registryAddr, false, this.isFork);
        await redeploy('FluidVaultT1Adjust', this.registryAddr, false, this.isFork);
        await redeploy('FluidVaultT1Withdraw', this.registryAddr, false, this.isFork);
        await redeploy('FluidVaultT1Payback', this.registryAddr, false, this.isFork);
        this.contracts.mockWrapper = await redeploy('MockExchangeWrapperUsdFeed', this.registryAddr, false, this.isFork);
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
            addrs[getNetwork()].FLUID_VAULT_T1_RESOLVER_ADDR,
        );

        const nftIds = await fluidVaultT1Resolver.positionsNftIdOfUser(this.proxy.address);

        return nftIds[nftIds.length - 1];
    }

    async getRatio(nftId) {
        const positionData = await this.contracts.view.getPositionByNftId(nftId);
        return positionData.position.ratio;
    }
}

module.exports = {
    BaseFluidT1StrategyTest,
};
