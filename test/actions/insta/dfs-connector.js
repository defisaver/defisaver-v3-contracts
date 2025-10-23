/* eslint-disable max-len */
const { expect } = require('chai');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');

const {
    redeploy,
    impersonateAccount,
    stopImpersonatingAccount,
    setBalance,
    sendEther,
    WETH_ADDRESS,
    balanceOf,
    approve,
} = require('../../utils/utils');
const { executeAction } = require('../../utils/actions');
const { addDefiSaverConnector } = require('../../utils/insta');

const dfsConnectorTest = async () => {
    describe('Test DefiSaverConnector', function () {
        this.timeout(150000);

        const dsaOwner = '0xF6Da9e9D73d7893223578D32a95d6d7de5522767';
        const dsaAddress = '0x4C6Cd7b623e7E7741C20bdAF3452269277534eF8';

        let dfsConnector;
        let flContract;
        let dsaSigner;
        let dsaContract;

        before(async () => {
            dfsConnector = await redeploy('DefiSaverConnector');
            dsaSigner = hre.ethers.provider.getSigner(dsaOwner);
            dsaSigner.address = dsaOwner;
            dsaContract = await hre.ethers.getContractAt('IInstaAccountV2', dsaAddress, dsaSigner);

            // Fund dsa account
            const zeroAddress = hre.ethers.constants.AddressZero;
            const zeroAcc = hre.ethers.provider.getSigner(zeroAddress);
            await impersonateAccount(zeroAddress);
            await sendEther(zeroAcc, dsaOwner, '5');
            await stopImpersonatingAccount(zeroAddress);

            await addDefiSaverConnector(dfsConnector.address);

            flContract = await redeploy('FLAction');
            await redeploy('RecipeExecutor');
        });

        it('... execute simple recipe with existing dsa account', async () => {
            const amount = hre.ethers.utils.parseUnits('1', 18);
            await setBalance(WETH_ADDRESS, dsaOwner, amount);
            await impersonateAccount(dsaOwner);
            await approve(WETH_ADDRESS, dsaAddress, dsaSigner);
            await stopImpersonatingAccount(dsaOwner);

            const pullTokenAction = new dfs.actions.basic.PullTokenAction(
                WETH_ADDRESS,
                dsaOwner,
                amount,
            );
            const sendTokenAction = new dfs.actions.basic.SendTokenAction(
                WETH_ADDRESS,
                dsaOwner,
                amount,
            );
            const basicRecipe = new dfs.Recipe('BasicRecipe', [
                pullTokenAction,
                sendTokenAction,
            ]);
            const functionData = basicRecipe.encodeForDsProxyCall()[1];

            const balanceBefore = await balanceOf(WETH_ADDRESS, dsaOwner);

            await executeAction('RecipeExecutor', functionData, dsaContract);

            const balanceAfter = await balanceOf(WETH_ADDRESS, dsaOwner);
            expect(balanceAfter).to.be.eq(balanceBefore);
        });

        it('... execute fl recipe with existing dsa account', async () => {
            const amount = hre.ethers.utils.parseUnits('1', 18);

            const basicRecipe = new dfs.Recipe('BasicRecipe', [
                new dfs.actions.flashloan.FLAction(
                    new dfs.actions.flashloan.BalancerFlashLoanAction(
                        [WETH_ADDRESS],
                        [amount],
                    ),
                ),
                new dfs.actions.basic.SendTokenAction(
                    WETH_ADDRESS,
                    flContract.address,
                    amount,
                ),
            ]);

            const functionData = basicRecipe.encodeForDsProxyCall()[1];
            await executeAction('RecipeExecutor', functionData, dsaContract);

            // check if any auth is left on dsa account
            const isAuth = await dsaContract.isAuth(flContract.address);
            expect(isAuth).to.be.eq(false);
        });
    });
};

describe('DefiSaverConnector', function () {
    this.timeout(80000);
    it('... forward calls to the RecipeExecutor via delegatecall in context of DSA accounts', async () => {
        await dfsConnectorTest();
    });
});

module.exports = {
    dfsConnectorTest,
};
