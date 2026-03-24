const hre = require('hardhat');
const { topUp } = require('../utils/fork');
const { network } = require('../../test/utils/utils');
const { signBorrowPermit } = require('../../test/utils/aaveV4');

async function main() {
    const senderAcc = new hre.ethers.Wallet(process.env.PRIV_KEY_MAINNET, hre.ethers.provider);
    await topUp(senderAcc.address, network);

    const spokeAddr = '0xF1Fa1042474dC8bd4Ef830Fe70aE22C85A326729';
    const debtReserveId = 4;
    const proxyAddress = '0xf1f66f2C743C8f786b2cC7F4fe4425d9F6dF7843';

    const {
        signature: borrowSig,
        nonce: borrowNonce,
        deadline: borrowDeadline,
    } = await signBorrowPermit(
        senderAcc,
        spokeAddr,
        debtReserveId,
        proxyAddress,
        hre.ethers.constants.MaxUint256,
    );

    console.log('borrowSig:', borrowSig);
    console.log('borrowNonce:', borrowNonce);
    console.log('borrowDeadline:', borrowDeadline);

    const spokeContract = await hre.ethers.getContractAt('ISpoke', spokeAddr);
    const nonce = await spokeContract.nonces(senderAcc.address, 1);
    console.log('nonce:', nonce);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
