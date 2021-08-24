const { expect } = require('chai');
const hre = require('hardhat');

const {
    redeploy,
    balanceOf,
    WETH_ADDRESS,
    ETH_ADDR,
    depositToWeth,
    sendEther,
    impersonateAccount,
    stopImpersonatingAccount,
    DAI_ADDR,
    MAX_UINT,
    send,
    nullAddress,
} = require('../utils');

describe('Fee-Receiver', function () {
    this.timeout(80000);

    let feeReceiver;
    let senderAcc;

    const MULTISIG_ADDR = '0xA74e9791D7D66c6a14B2C571BdA0F2A1f6D64E06';

    before(async () => {
        feeReceiver = await redeploy('FeeReceiver');

        senderAcc = (await hre.ethers.getSigners())[0];

        await impersonateAccount(MULTISIG_ADDR);

        await sendEther(senderAcc, MULTISIG_ADDR, '0.5');

        const signer = await hre.ethers.provider.getSigner(MULTISIG_ADDR);
        feeReceiver = feeReceiver.connect(signer);
    });

    it('... should be able to withdraw 1 Weth', async () => {
        const wethAmount = hre.ethers.utils.parseUnits('3', 18);
        const oneWeth = hre.ethers.utils.parseUnits('1', 18);

        // deposit 3 weth to contract
        await depositToWeth(wethAmount);
        await send(WETH_ADDRESS, feeReceiver.address, wethAmount);

        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);

        // withdraw 1 weth
        await feeReceiver.withdrawToken(WETH_ADDRESS, senderAcc.address, oneWeth);

        const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

        // if we got that one weth to senderAcc
        expect(wethBalanceBefore.add(oneWeth)).to.be.eq(wethBalanceAfter);
    });

    it('... should be able to withdraw whole weth balance', async () => {
        const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
        const contractWethBalance = await balanceOf(WETH_ADDRESS, feeReceiver.address);

        // withdraw whole weth balance
        await feeReceiver.withdrawToken(WETH_ADDRESS, senderAcc.address, 0);

        const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

        // if we got that one weth to senderAcc
        expect(wethBalanceBefore.add(contractWethBalance)).to.be.eq(wethBalanceAfter);
    });

    it('... should be able to withdraw 1 Eth', async () => {
        const ethAmount = '3';
        const oneEth = hre.ethers.utils.parseUnits('1', 18);

        // deposit 3 eth to contract
        await sendEther(senderAcc, feeReceiver.address, ethAmount);

        const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);

        // withdraw 1 eth
        await feeReceiver.withdrawEth(senderAcc.address, oneEth);

        const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);

        // if we got that one eth to senderAcc
        expect(ethBalanceBefore.add(oneEth)).to.be.eq(ethBalanceAfter);
    });

    it('... should be able to withdraw whole Eth balance', async () => {
        const contractEthBalance = await balanceOf(ETH_ADDR, feeReceiver.address);
        const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);

        // withdraw whole eth balance
        await feeReceiver.withdrawEth(senderAcc.address, 0);

        const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);

        // if we got that one eth to senderAcc
        expect(ethBalanceBefore.add(contractEthBalance)).to.be.eq(ethBalanceAfter);
    });

    it('... should fail to withdraw Weth as the caller is not admin', async () => {
        try {
            feeReceiver = feeReceiver.connect(senderAcc);

            await feeReceiver.withdrawToken(WETH_ADDRESS, senderAcc.address, 0);
        } catch (err) {
            expect(err.toString()).to.have.string('Only Admin');
        }
    });

    it('... should fail to withdraw Eth as the caller is not admin', async () => {
        try {
            feeReceiver = feeReceiver.connect(senderAcc);

            await feeReceiver.withdrawEth(senderAcc.address, 0);
        } catch (err) {
            expect(err.toString()).to.have.string('Only Admin');
        }
    });
});
