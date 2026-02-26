const hre = require('hardhat');
const { topUp } = require('../utils/fork');
const { network, approve, setBalance } = require('../../test/utils/utils');

async function main() {
    const senderAcc = (await hre.ethers.getSigners())[0];
    await topUp(senderAcc.address, network);

    const coreSpoke = '0x46539e9123A18c427e6b4DFF114c28CF405Cb023';
    const spoke = await hre.ethers.getContractAt('ISpoke', coreSpoke);
    const reserveCount = await spoke.getReserveCount();

    for (let i = 0; i < reserveCount; i++) {
        const reserve = await spoke.getReserve(i);
        const underlying = reserve.underlying;
        console.log('Underlying:', underlying);
        const amount = hre.ethers.utils.parseUnits('1000000', reserve.decimals);

        try {
            await setBalance(underlying, senderAcc.address, amount);
            await approve(underlying, spoke.address, senderAcc);
            await spoke.supply(i, amount, senderAcc.address, { gasLimit: 3000000 });
        } catch (error) {
            console.error('Failed to add liquidity for reserve', underlying, i);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
