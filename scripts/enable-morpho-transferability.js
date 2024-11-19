/* eslint-disable import/no-extraneous-dependencies */
const hre = require('hardhat');
const { start } = require('./utils/starter');

async function main() {
    const legacyMorphoTokenAddr = '0x9994E35Db50125E0DF82e4c2dde62496CE330999';
    let legacyMorphoTokenContract = await hre.ethers.getContractAt('ILegacyMorphoToken', legacyMorphoTokenAddr);
    const legacyMorphoTokenOwner = await legacyMorphoTokenContract.owner();
    const morphoOwnerSigner = await hre.ethers.provider.getSigner(legacyMorphoTokenOwner);
    legacyMorphoTokenContract = legacyMorphoTokenContract.connect(morphoOwnerSigner);

    const role = 1;
    const enabled = true;
    const transferFromSelector = hre.ethers.utils.id('transferFrom(address,address,uint256)').slice(0, 10);
    await legacyMorphoTokenContract.setRoleCapability(role, transferFromSelector, enabled);

    const morphoTokenWrapper = '0x9D03bb2092270648d7480049d0E58d2FcF0E5123';
    await legacyMorphoTokenContract.setUserRole(morphoTokenWrapper, role, enabled);

    process.exit(0);
}

start(main);
