const { expect } = require('chai');
const hre = require('hardhat');

const {
    redeploy,
    balanceOf,
    WETH_ADDRESS,
    ETH_ADDR,
    depositToWeth,
    impersonateAccount,
    stopImpersonatingAccount,
    DAI_ADDR,
    MAX_UINT,
    send,
    nullAddress,
} = require('../utils');

describe('Bot-Refills', function () {
    this.timeout(80000);

    let botRefills;
    let refillCaller; let refillAddr; let feeAddr;

    before(async () => {
        botRefills = await redeploy('BotRefills');

        refillAddr = '0x5aa40C7C8158D8E29CA480d7E05E5a32dD819332';
        feeAddr = '0x76720ac2574631530ec8163e4085d6f98513fb27';
        refillCaller = '0x33fDb79aFB4456B604f376A45A546e7ae700e880';

        // give approval to contract from feeAddr
        await impersonateAccount(feeAddr);

        let daiContract = await hre.ethers.getContractAt('IERC20', DAI_ADDR);
        let wethContract = await hre.ethers.getContractAt('IERC20', WETH_ADDRESS);

        const signer = await hre.ethers.provider.getSigner(feeAddr);
        wethContract = wethContract.connect(signer);
        daiContract = daiContract.connect(signer);

        await wethContract.approve(botRefills.address, MAX_UINT);
        await daiContract.approve(botRefills.address, MAX_UINT);

        // clean out all weth on fee addr for test to work
        const wethFeeAddrBalance = await balanceOf(WETH_ADDRESS, feeAddr);
        await wethContract.transfer(nullAddress, wethFeeAddrBalance);

        await stopImpersonatingAccount(feeAddr);
    });

    it('... should call refill with WETH', async () => {
        await impersonateAccount(refillCaller);

        const ethBotAddrBalanceBefore = await balanceOf(ETH_ADDR, refillAddr);

        const signer = await hre.ethers.provider.getSigner(refillCaller);
        botRefills = botRefills.connect(signer);

        const ethRefillAmount = hre.ethers.utils.parseUnits('4', 18);

        const wethFeeAddrBalance = await balanceOf(WETH_ADDRESS, feeAddr);

        if (wethFeeAddrBalance.lt(ethRefillAmount)) {
            await depositToWeth(ethRefillAmount);
            await send(WETH_ADDRESS, feeAddr, ethRefillAmount);
        }

        await botRefills.refill(ethRefillAmount, refillAddr);

        const ethBotAddrBalanceAfter = await balanceOf(ETH_ADDR, refillAddr);

        expect(ethBotAddrBalanceAfter).to.be.eq(ethBotAddrBalanceBefore.add(ethRefillAmount));

        await stopImpersonatingAccount(refillCaller);
    });

    it('... should call refill with DAI', async () => {
        await impersonateAccount(refillCaller);
        const ethBotAddrBalanceBefore = await balanceOf(ETH_ADDR, refillAddr);

        const signer = await hre.ethers.provider.getSigner(refillCaller);
        botRefills = botRefills.connect(signer);

        const ethRefillAmount = hre.ethers.utils.parseUnits('4', 18);

        await botRefills.refill(ethRefillAmount, refillAddr);

        const ethBotAddrBalanceAfter = await balanceOf(ETH_ADDR, refillAddr);

        console.log(ethBotAddrBalanceBefore.toString(), ethBotAddrBalanceAfter.toString());

        expect(ethBotAddrBalanceAfter).to.be.gt(ethBotAddrBalanceBefore);
        await stopImpersonatingAccount(refillCaller);
    });
});
