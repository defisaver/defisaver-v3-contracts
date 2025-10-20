/* eslint-disable import/no-extraneous-dependencies */
const hre = require('hardhat');

async function main() {
    const safe = await hre.ethers.getContractAt(
        'ISafe',
        '0x13fa3D42C09E5E15153F08bb90A79A3Bd63E289D',
    );
    const owners = await safe.getOwners();
    console.log(owners);
    const threshold = await safe.getThreshold();
    console.log(threshold);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
