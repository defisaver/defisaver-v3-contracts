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

const addDefiSaverConnector = async (dfsConnectorAddress) => {
    const instaConnectorsV2Address = '0x97b0B3A8bDeFE8cB9563a3c610019Ad10DB8aD11';

    const masterAddr = '0x2386DC45AdDed673317eF068992F19421B481F4c';
    const masterSigner = await hre.ethers.getSigner(masterAddr);
    const instaConnectorsV2Contract = await hre.ethers.getContractAt('IInstaConnectorsV2', instaConnectorsV2Address, masterSigner);

    // Fund master account
    const zeroAddress = hre.ethers.constants.AddressZero;
    const zeroAcc = await hre.ethers.provider.getSigner(zeroAddress);
    await impersonateAccount(zeroAddress);
    await sendEther(zeroAcc, masterAddr, '5');
    await stopImpersonatingAccount(zeroAddress);

    // Add connector
    await impersonateAccount(masterAddr);
    await instaConnectorsV2Contract.addConnectors(
        ['DefiSaverConnector'],
        [dfsConnectorAddress],
        { gasLimit: 800000 },
    );
    await stopImpersonatingAccount(masterAddr);

    // Check if connector is properly added
    const response = await instaConnectorsV2Contract.isConnectors(['DefiSaverConnector']);
    expect(response.isOk).to.be.eq(true);
};

const dfsConnectorTest = async () => {
    describe('Test DefiSaverConnector', function () {
        this.timeout(150000);

        let dfsConnector;

        before(async () => {
            dfsConnector = await redeploy('DefiSaverConnector');
        });

        it('... execute simple recipe with existing dsa account', async () => {
            const dsaOwner = '0xF6Da9e9D73d7893223578D32a95d6d7de5522767';
            const dsaSigner = hre.ethers.provider.getSigner(dsaOwner);
            dsaSigner.address = dsaOwner;

            // Fund dsa account
            const zeroAddress = hre.ethers.constants.AddressZero;
            const zeroAcc = hre.ethers.provider.getSigner(zeroAddress);
            await impersonateAccount(zeroAddress);
            await sendEther(zeroAcc, dsaOwner, '5');
            await stopImpersonatingAccount(zeroAddress);

            const dsaAddress = '0x4C6Cd7b623e7E7741C20bdAF3452269277534eF8';
            const dsaContract = await hre.ethers.getContractAt('IInstaAccountV2', dsaAddress, dsaSigner);

            await addDefiSaverConnector(dfsConnector.address);

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
