const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');
const {
    takeSnapshot,
    revertToSnapshot,
    getProxy,
    redeploy,
    addrs,
    getNetwork,
    getOwnerAddr, setBalance, approve, getGasUsed,
} = require('../../utils');
const { topUp } = require('../../../scripts/utils/fork');
const {
    getEulerV2TestPairs, eulerV2CreatePosition, EVC_ADDR,
} = require('../utils');

const eulerV2CreateTest = async (testPair) => {
    describe('EulerV2-Create-Compare', function () {
        this.timeout(100000);
        let isFork;
        const REGISTRY_ADDR = addrs[getNetwork()].REGISTRY_ADDR;

        let snapshot;
        let senderAcc;
        let proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            isFork = hre.network.name === 'fork';
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
            }
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            await redeploy('EulerV2Supply', REGISTRY_ADDR, false, isFork);
            await redeploy('EulerV2Borrow', REGISTRY_ADDR, false, isFork);
        });
        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        it(`should create EulerV2 position: ${testPair.supplyTokenSymbol} / ${testPair.borrowTokenSymbol}`, async () => {
            const supplyVault = testPair.supplyVault;
            const supplyTokenSymbol = testPair.supplyTokenSymbol;
            const supplyTokenAsset = getAssetInfo(supplyTokenSymbol);
            const supplyToken = supplyTokenAsset.address;
            const supplyAmount = testPair.supplyAmount;
            const borrowVault = testPair.borrowVault;
            const borrowAmount = testPair.borrowAmount;

            await eulerV2CreatePosition(
                supplyToken,
                supplyVault,
                supplyAmount,
                borrowVault,
                borrowAmount,
                senderAcc,
                proxy,
            );
        });
        it(`should create EulerV2 position with multicall: ${testPair.supplyTokenSymbol} / ${testPair.borrowTokenSymbol}`, async () => {
            const supplyVault = testPair.supplyVault;
            const supplyTokenSymbol = testPair.supplyTokenSymbol;
            const supplyTokenAsset = getAssetInfo(supplyTokenSymbol);
            const supplyToken = supplyTokenAsset.address;
            const supplyAmount = testPair.supplyAmount;
            const borrowVault = testPair.borrowVault;
            const borrowAmount = testPair.borrowAmount;

            const evcContract = await hre.ethers.getContractAt('IEVC', EVC_ADDR);
            const erc4626Abi = [{
                inputs: [{ internalType: 'uint256', name: 'amount', type: 'uint256' }, { internalType: 'address', name: 'receiver', type: 'address' }], name: 'deposit', outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }], stateMutability: 'nonpayable', type: 'function',
            }];
            const depositVaultContract = await hre.ethers.getContractAt(erc4626Abi, supplyVault);
            const borrowVaultContract = await hre.ethers.getContractAt('IBorrowing', borrowVault);

            const account = senderAcc.address;

            await setBalance(supplyToken, account, supplyAmount);
            await approve(supplyToken, supplyVault, senderAcc);

            const enableCollateralCall = {
                targetContract: EVC_ADDR,
                onBehalfOfAccount: hre.ethers.constants.AddressZero,
                value: 0,
                data: evcContract.interface.encodeFunctionData(
                    'enableCollateral',
                    [account, supplyVault],
                ),
            };
            const supplyCollateralCall = {
                targetContract: supplyVault,
                onBehalfOfAccount: account,
                value: 0,
                data: depositVaultContract.interface.encodeFunctionData(
                    'deposit',
                    [supplyAmount, account],
                ),
            };
            const enableControllerCall = {
                targetContract: EVC_ADDR,
                onBehalfOfAccount: hre.ethers.constants.AddressZero,
                value: 0,
                data: evcContract.interface.encodeFunctionData(
                    'enableController',
                    [account, borrowVault],
                ),
            };
            const borrowFromControllerCall = {
                targetContract: borrowVault,
                onBehalfOfAccount: account,
                value: 0,
                data: borrowVaultContract.interface.encodeFunctionData(
                    'borrow',
                    [borrowAmount, account],
                ),
            };

            const receipt = await evcContract.connect(senderAcc).batch([
                enableCollateralCall,
                supplyCollateralCall,
                enableControllerCall,
                borrowFromControllerCall,
            ], { gasLimit: 2000000 });

            const gasUsed = await getGasUsed(receipt);
            console.log(`Gas used using multi-call; ${gasUsed}`);
        });
    });
};

describe('EulerV2-Create', function () {
    this.timeout(80000);

    it('...test eulerV2 create', async () => {
        const supplyAmountInUsd = '50000';
        const borrowAmountInUsd = '25000';
        const testPairs = await getEulerV2TestPairs(supplyAmountInUsd, borrowAmountInUsd);
        await eulerV2CreateTest(testPairs[0]);
    }).timeout(50000);
});
