const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    redeploy,
    balanceOf,
    WETH_ADDRESS,
    approve,
    depositToWeth,
    STETH_ADDRESS,
    WSTETH_ADDRESS,
} = require('../utils');

const { lidoStake, lidoWrap, lidoUnwrap } = require('../actions.js');

const lidoStakeTest = async () => {
    describe('Lido WETH staking', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... stake 10 WETH to LIDO', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await depositToWeth(amount);
            await approve(WETH_ADDRESS, proxy.address);

            const stEthBalanceBefore = await balanceOf(STETH_ADDRESS, senderAcc.address);
            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            await lidoStake(amount, senderAcc.address, senderAcc.address, proxy);
            const stEthBalanceAfter = await balanceOf(STETH_ADDRESS, senderAcc.address);
            const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

            expect(wethBalanceAfter).to.be.eq(wethBalanceBefore.sub(amount));

            const wethChange = wethBalanceBefore.sub(wethBalanceAfter);
            const stEthChange = stEthBalanceAfter.sub(stEthBalanceBefore);
            const difference = wethChange.sub(stEthChange);
            expect(difference.toNumber()).to.be.within(0, 3);
        }).timeout(50000);
    });
};

const lidoWrapTest = async () => {
    describe('Lido WStEth', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... stake 10 WETH to LIDO and then wrap them', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await depositToWeth(amount);
            await approve(WETH_ADDRESS, proxy.address);

            const stEthBalanceBefore = await balanceOf(STETH_ADDRESS, senderAcc.address);
            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            await lidoStake(amount, senderAcc.address, senderAcc.address, proxy);
            const stEthBalanceAfter = await balanceOf(STETH_ADDRESS, senderAcc.address);
            const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

            expect(wethBalanceAfter).to.be.eq(wethBalanceBefore.sub(amount));

            const wethChange = wethBalanceBefore.sub(wethBalanceAfter);
            console.log(`Deposited ${wethChange.toString()} WETH`);
            const stEthChange = stEthBalanceAfter.sub(stEthBalanceBefore);
            console.log(`Received ${stEthChange.toString()} StETH`);
            const difference = wethChange.sub(stEthChange);
            expect(difference.toNumber()).to.be.within(0, 3);

            await approve(STETH_ADDRESS, proxy.address);
            const wStEthBalanceBefore = await balanceOf(WSTETH_ADDRESS, senderAcc.address);
            await lidoWrap(stEthBalanceAfter, senderAcc.address, senderAcc.address, false, proxy);
            const wStEthBalanceAfter = await balanceOf(WSTETH_ADDRESS, senderAcc.address);

            const wStEthChange = wStEthBalanceAfter.sub(wStEthBalanceBefore);

            console.log(`After wrapping received ${wStEthChange.toString()} WStEth`);
        }).timeout(50000);

        it('... stake 10 WETH to LIDO and then wrap them, using Uint.max for wrapping input', async () => {
            const amount = hre.ethers.utils.parseUnits('20', 18);
            await depositToWeth(amount);
            await approve(WETH_ADDRESS, proxy.address);

            const stEthBalanceBefore = await balanceOf(STETH_ADDRESS, senderAcc.address);
            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            await lidoStake(amount, senderAcc.address, senderAcc.address, proxy);
            const stEthBalanceAfter = await balanceOf(STETH_ADDRESS, senderAcc.address);
            const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

            expect(wethBalanceAfter).to.be.eq(wethBalanceBefore.sub(amount));

            const wethChange = wethBalanceBefore.sub(wethBalanceAfter);
            console.log(`Deposited ${wethChange.toString()} WETH`);
            const stEthChange = stEthBalanceAfter.sub(stEthBalanceBefore);
            console.log(`Received ${stEthChange.toString()} StETH`);
            const difference = wethChange.sub(stEthChange);
            expect(difference.toNumber()).to.be.within(0, 3);

            await approve(STETH_ADDRESS, proxy.address);
            const wStEthBalanceBefore = await balanceOf(WSTETH_ADDRESS, senderAcc.address);
            await lidoWrap(
                hre.ethers.constants.MaxUint256, senderAcc.address, senderAcc.address, false, proxy,
            );
            const wStEthBalanceAfter = await balanceOf(WSTETH_ADDRESS, senderAcc.address);

            const wStEthChange = wStEthBalanceAfter.sub(wStEthBalanceBefore);

            console.log(`After wrapping received ${wStEthChange.toString()} WStEth`);
        }).timeout(50000);

        it('... directly transform 10 WETH to WstEth', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await depositToWeth(amount);
            await approve(WETH_ADDRESS, proxy.address);

            const wStEthBalanceBefore = await balanceOf(WSTETH_ADDRESS, senderAcc.address);
            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            await lidoWrap(amount, senderAcc.address, senderAcc.address, true, proxy);

            const wStEthBalanceAfter = await balanceOf(WSTETH_ADDRESS, senderAcc.address);
            const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

            expect(wethBalanceAfter).to.be.eq(wethBalanceBefore.sub(amount));

            const wethChange = wethBalanceBefore.sub(wethBalanceAfter);
            console.log(`Deposited ${wethChange.toString()} WETH`);
            const wStEthChange = wStEthBalanceAfter.sub(wStEthBalanceBefore);
            console.log(`After wrapping received ${wStEthChange.toString()} WStEth`);
        }).timeout(50000);
    });
};

const lidoUnwrapTest = async () => {
    describe('Lido WETH staking', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... directly transform 10 WETH to WstEth and then unwrap into StEth', async () => {
            const amount = hre.ethers.utils.parseUnits('10', 18);
            await depositToWeth(amount);
            await approve(WETH_ADDRESS, proxy.address);

            const wStEthBalanceBefore = await balanceOf(WSTETH_ADDRESS, senderAcc.address);
            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            await lidoWrap(amount, senderAcc.address, senderAcc.address, true, proxy);

            const wStEthBalanceAfter = await balanceOf(WSTETH_ADDRESS, senderAcc.address);
            const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

            expect(wethBalanceAfter).to.be.eq(wethBalanceBefore.sub(amount));
            const wethChange = wethBalanceBefore.sub(wethBalanceAfter);
            console.log(`Deposited ${wethChange.toString()} WETH`);

            const wStEthChange = wStEthBalanceAfter.sub(wStEthBalanceBefore);
            console.log(`Received ${wStEthChange.toString()} WStEth`);

            await approve(WSTETH_ADDRESS, proxy.address);
            const stEthBalanceBefore = await balanceOf(STETH_ADDRESS, senderAcc.address);
            await lidoUnwrap(amount, senderAcc.address, senderAcc.address, proxy);
            const stEthBalanceAfter = await balanceOf(STETH_ADDRESS, senderAcc.address);
            const stEthChange = stEthBalanceAfter.sub(stEthBalanceBefore);
            console.log(`After unwrapping received ${stEthChange.toString()} StEth`);
        }).timeout(50000);
    });
};
const lidoDeployContracts = async () => {
    await redeploy('LidoStake');
    await redeploy('LidoWrap');
    await redeploy('LidoUnwrap');
};
const lidoFullTest = async () => {
    await lidoDeployContracts();
    await lidoStakeTest();
    await lidoWrapTest();
    await lidoUnwrapTest();
};
module.exports = {
    lidoFullTest,
    lidoDeployContracts,
    lidoStakeTest,
    lidoWrapTest,
    lidoUnwrapTest,
};
