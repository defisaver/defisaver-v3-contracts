const hre = require('hardhat');

async function main() {
    const coreOracle = '0x1da2C38dF15077Fde873EaFFA29e88D50836814a';
    const mockArtifact = await hre.artifacts.readArtifact('MockAaveV4Oracle');
    await hre.network.provider.send('hardhat_setCode', [coreOracle, mockArtifact.deployedBytecode]);

    const oracleContract = await hre.ethers.getContractAt('IAaveV4Oracle', coreOracle);
    const ethPrice = await oracleContract.getReservePrice(0);
    console.log('Eth price:', ethPrice);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
