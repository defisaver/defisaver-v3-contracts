const hre = require('hardhat');
const { topUp } = require('../utils/fork');
const { network } = require('../../test/utils/utils');
const { SPOKES, HUBS } = require('../../test/utils/aaveV4');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);

    const mockArtifact = await hre.artifacts.readArtifact('MockAuthorityAaveV4');
    const spokeConfig = ['1099511627775', '1099511627775', '16777215', true, false];

    // Set mock authority for all hubs
    for (const hubAddr of HUBS) {
        const hubContract = await hre.ethers.getContractAt('IHub', hubAddr);
        const authority = await hubContract.authority();
        await hre.network.provider.send('hardhat_setCode', [
            authority,
            mockArtifact.deployedBytecode,
        ]);
        console.log(`Set mock authority for ${hubAddr}`);
    }
    console.log('Finished setting mock authorities for all hubs');

    // Set spoke config for all spokes
    for (const spokeAddr of SPOKES) {
        const spokeContract = await hre.ethers.getContractAt('ISpoke', spokeAddr);
        const reserveCount = await spokeContract.getReserveCount();
        for (let i = 0; i < reserveCount; i++) {
            const reserve = await spokeContract.getReserve(i);
            const hub = await hre.ethers.getContractAt('IHub', reserve.hub);
            await hub.updateSpokeConfig(reserve.assetId, spokeAddr, spokeConfig);
            console.log(
                `Set spoke config for ${spokeAddr} on ${reserve.hub} for asset ${reserve.assetId}`,
            );
        }
        console.log(`Finished setting spoke config for ${spokeAddr}`);
    }
    console.log('Finished setting spoke configs for all spokes');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
