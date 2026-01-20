const hre = require('hardhat');
const { topUp } = require('./utils/fork');
const { network } = require('../test/utils/utils');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);

    const coreHub = '0xaD905aD5EA5B98cD50AE40Cfe368344686a21366';
    const coreSpoke = '0xBa97c5E52cd5BC3D7950Ae70779F8FfE92d40CdC';
    const authority = '0x56D22D619355ab10B80933c7F50569d95576D003';

    const hub = await hre.ethers.getContractAt('IHub', coreHub);
    const spoke = await hre.ethers.getContractAt('ISpoke', coreSpoke);

    const mockArtifact = await hre.artifacts.readArtifact('MockAuthorityAaveV4');
    await hre.network.provider.send('hardhat_setCode', [authority, mockArtifact.deployedBytecode]);

    const spokeConfig = ['1099511627774', '1099511627774', '16777214', true, true];

    const reserveCount = await spoke.getReserveCount();

    for (let i = 0; i < reserveCount; i++) {
        const reserve = await spoke.getReserve(i);
        if (reserve.hub !== coreHub) {
            const hubAlt = await hre.ethers.getContractAt('IHub', reserve.hub);
            const authorityAlt = await hubAlt.authority();
            await hre.network.provider.send('hardhat_setCode', [
                authorityAlt,
                mockArtifact.deployedBytecode,
            ]);
            await hubAlt.updateSpokeConfig(reserve.assetId, coreSpoke, spokeConfig);
        } else {
            await hub.updateSpokeConfig(reserve.assetId, coreSpoke, spokeConfig);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
