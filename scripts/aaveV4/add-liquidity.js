const hre = require('hardhat');
const { topUp } = require('../utils/fork');
const { network, approve, setBalance } = require('../../test/utils/utils');
const { SPOKES } = require('../../test/utils/aaveV4');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);

    for (const spokeAddr of SPOKES) {
        const spokeContract = await hre.ethers.getContractAt('ISpoke', spokeAddr);
        const reserveCount = await spokeContract.getReserveCount();
        for (let i = 0; i < reserveCount; i++) {
            const reserve = await spokeContract.getReserve(i);
            const underlying = reserve.underlying;
            console.log('Underlying:', underlying);
            const amount = hre.ethers.utils.parseUnits('1000000', reserve.decimals);
            try {
                await setBalance(underlying, senderAcc.address, amount);
                await approve(underlying, spokeContract.address, senderAcc);
                await spokeContract.supply(i, amount, senderAcc.address, { gasLimit: 3000000 });
            } catch (error) {
                console.error('Failed to add liquidity for reserve', underlying, i);
            }
        }
        console.log('Finished adding liquidity for spoke', spokeAddr);
    }
    console.log('Finished adding liquidity for all spokes');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
