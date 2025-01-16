const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');
const { topUp } = require('../../../scripts/utils/fork');
const {
    getProxy, addrs, getNetwork, getContractFromRegistry,
    getOwnerAddr,
    setBalance,
    BOLD_ADDR,
    DAI_ADDR,
    takeSnapshot,
    revertToSnapshot,
} = require('../../utils');
const { uniV3CreatePool, liquityV2Open } = require('../../actions');
const { addBotCaller } = require('../../utils-strategies');

class BaseLiquityV2StrategyTest {
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

        await this.setUpCallers();
        await this.setUpContracts();
        await this.addLiquidity();
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
        this.contracts.view = await getContractFromRegistry('LiquityV2View', this.registryAddr, false, this.isFork);
    }

    async addLiquidity() {
        const token0 = BOLD_ADDR;
        const token1 = DAI_ADDR;
        const fee = '100';
        const lowerTick = -101;
        const upperTick = 99;
        const currentSqrtPriceX96 = BigInt(2) ** BigInt(96);
        const token0Amount = hre.ethers.utils.parseUnits('1000000000', 18);
        const token1Amount = hre.ethers.utils.parseUnits('1000000000', 18);
        await setBalance(token0, this.senderAcc.address, token0Amount);
        await setBalance(token1, this.senderAcc.address, token1Amount);
        await uniV3CreatePool(
            this.proxy,
            token0,
            token1,
            fee,
            lowerTick,
            upperTick,
            token0Amount,
            token1Amount,
            this.senderAcc.address,
            this.senderAcc.address,
            currentSqrtPriceX96.toString(),
        );
    }

    async openTrove(testPair, collAmount, debtAmount) {
        const collAsset = getAssetInfo(testPair.supplyTokenSymbol);
        const interestRate = hre.ethers.utils.parseUnits('1', 18);
        const ownerIndex = 0;

        await liquityV2Open(
            this.proxy,
            testPair.market,
            testPair.collIndex,
            collAsset.address,
            collAmount,
            debtAmount,
            interestRate,
            hre.ethers.constants.AddressZero,
            ownerIndex,
            this.senderAcc.address,
            this.senderAcc.address,
            this.isFork,
        );

        const encodedData = hre.ethers.utils.defaultAbiCoder.encode(
            ['address', 'uint256'],
            [this.proxy.address, ownerIndex],
        );
        const troveId = hre.ethers.utils.keccak256(encodedData);

        return troveId;
    }
}

module.exports = {
    BaseLiquityV2StrategyTest,
};