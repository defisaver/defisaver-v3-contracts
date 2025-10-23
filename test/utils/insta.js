const { expect } = require('chai');
const hre = require('hardhat');
const {
    impersonateAccount, stopImpersonatingAccount, sendEther, addrs, network,
} = require('./utils');

const addDefiSaverConnector = async (dfsConnectorAddress) => {
    const instaIndex = await hre.ethers.getContractAt('IInstaIndex', addrs[network].INSTADAPP_INDEX_V2);
    const masterAddr = await instaIndex.master();
    const masterSigner = await hre.ethers.getSigner(masterAddr);
    const instaConnectorsV2Contract = await hre.ethers.getContractAt(
        'IInstaConnectorsV2',
        addrs[network].INSTADAPP_CONNECTORS_V2,
        masterSigner,
    );

    const isConnectorAlreadyAdded = await instaConnectorsV2Contract.isConnectors(['DefiSaverConnector']);
    if (isConnectorAlreadyAdded.isOk) {
        return;
    }

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

module.exports = {
    addDefiSaverConnector,
};
