const hre = require('hardhat');
const { topUp } = require('../utils/fork');
const { network } = require('../../test/utils/utils');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);

    const coreHub = '0x3Ed2C9829FBCab6015E331a0352F8ae148217D70';
    const coreSpoke = '0x46539e9123A18c427e6b4DFF114c28CF405Cb023';
    const authority = '0x56D22D619355ab10B80933c7F50569d95576D003';

    const hub = await hre.ethers.getContractAt('IHub', coreHub);
    const spoke = await hre.ethers.getContractAt('ISpoke', coreSpoke);

    const mockArtifact = await hre.artifacts.readArtifact('MockAuthorityAaveV4');
    await hre.network.provider.send('hardhat_setCode', [authority, mockArtifact.deployedBytecode]);

    const spokeConfig = ['1099511627774', '1099511627774', '16777214', true, false];

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
    console.log('AaveV4 caps set successfully');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
