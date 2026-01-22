const hre = require('hardhat');
const { topUp } = require('../utils/fork');
const { network, approve, setBalance } = require('../../test/utils/utils');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);

    const coreSpoke = '0xBa97c5E52cd5BC3D7950Ae70779F8FfE92d40CdC';
    const spoke = await hre.ethers.getContractAt('ISpoke', coreSpoke);
    const reserveCount = await spoke.getReserveCount();

    for (let i = 0; i < reserveCount; i++) {
        const reserve = await spoke.getReserve(i);
        const underlying = reserve.underlying;
        console.log('Underlying:', underlying);
        if (underlying === '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf') {
            continue; // topUp fails for cbBTC, skip for now
        }
        const amount = hre.ethers.utils.parseUnits('1000000', reserve.decimals);
        await setBalance(underlying, senderAcc.address, amount);
        await approve(underlying, spoke.address, senderAcc);
        await spoke.supply(i, amount, senderAcc.address, { gasLimit: 3000000 });
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
