const { expect } = require('chai');
const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');
const {
    balanceOf,
    getProxy,
    redeploy,
    WETH_ADDRESS,
    Float2BN,
    BN2Float,
    setBalance,
    approve,
    resetForkToBlock,
    fetchAmountinUSDPrice,
} = require('../utils');

const {
    liquityOpen,
    liquityBorrow,
    liquitySupply,
    liquityWithdraw,
    liquityPayback,
    liquityClose,

    liquitySPDeposit,
    liquitySPWithdraw,
    liquityEthGainToTrove,

    liquityStake,
    liquityUnstake,

    liquityRedeem,
} = require('../actions.js');

const lusdAddr = getAssetInfo('LUSD').address;
const lqtyAddr = getAssetInfo('LQTY').address;

const wethAmountTotalValue = 20000;
const collAmountOpenValue = 12000;
const collAmountSupplyValue = 4000;
const collAmountWithdrawValue = 4000;
const lusdAmountOpen = Float2BN('4000', 18);
const lusdAmountBorrow = Float2BN('2000', 18);
const lusdAmountPayback = Float2BN('2000', 18);
const lusdAmountFee = Float2BN('200', 18);
const maxFeePercentage = Float2BN('5', 16);

const wethAmountOpenValue = 12000;
const lusdAmountTotal = Float2BN('10000', 18);
const lusdAmountDeposit = Float2BN('4000', 18);
const lusdAmountWithdraw = Float2BN('4000', 18);

const lqtyAmountTotal = Float2BN(fetchAmountinUSDPrice('LQTY', 10000), 18);
const lqtyAmountStake = Float2BN(fetchAmountinUSDPrice('LQTY', 6000), 18);
const lqtyAmountUnstake = Float2BN(fetchAmountinUSDPrice('LQTY', 5000), 18);

const lusdAmountRedeem = Float2BN('4000', 18);

const forkBlokNum = 14368070;

const liquityOpenTest = async () => {
    describe('Liquity-Open', function () {
        this.timeout(1000000);

        let wethAmountTotal;
        let collAmountOpen;

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let liquityView;

        before(async () => {
            await resetForkToBlock(forkBlokNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityOpen');
            await redeploy('LiquityClose');

            const priceFeed = await hre.ethers.getContractAt('IPriceFeed', '0x4c517D4e2C851CA76d7eC94B805269Df0f2201De');
            const collPrice = BN2Float(await priceFeed.callStatic.fetchPrice());

            wethAmountTotal = Float2BN(`${wethAmountTotalValue / collPrice}`, 18);
            collAmountOpen = Float2BN(`${collAmountOpenValue / collPrice}`, 18);

            await setBalance(WETH_ADDRESS, senderAddr, wethAmountTotal);
            await setBalance(lusdAddr, senderAddr, lusdAmountFee);
            await approve(WETH_ADDRESS, proxyAddr);
            await approve(lusdAddr, proxyAddr);
        });

        afterEach(async () => {
            // eslint-disable-next-line object-curly-newline
            const { troveStatus, collAmount, debtAmount, collPrice } = await liquityView['getTroveInfo(address)'](proxyAddr);
            console.log(`\tTrove status: ${troveStatus}`);
            // eslint-disable-next-line eqeqeq
            if (troveStatus != 1) {
                console.log('\tTrove not active');
                return;
            }
            const CR = collAmount.mul(collPrice).div(debtAmount);

            console.log(`\tTrove coll:\t${BN2Float(collAmount)} ETH`);
            console.log(`\tTrove debt:\t${BN2Float(debtAmount)} LUSD`);
            console.log(`\tTrove CR:\t${BN2Float(CR.mul(100))}%`);
            console.log(`\tETH price:\t${BN2Float(collPrice)}`);
        });

        it(`... should open Trove with $${wethAmountTotalValue} WETH collateral and $${BN2Float(lusdAmountOpen)} LUSD net debt`, async () => {
            // eslint-disable-next-line max-len
            await liquityOpen(proxy, maxFeePercentage, collAmountOpen, lusdAmountOpen, senderAddr, senderAddr);

            const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
            expect(collAmount).to.equal(collAmountOpen);
            // eslint-disable-next-line max-len
            expect(await balanceOf(lusdAddr, senderAddr)).to.equal(lusdAmountOpen.add(lusdAmountFee));
        });

        it('... should close Trove', async () => {
            await liquityClose(proxy, senderAddr, senderAddr);
            expect(await balanceOf(WETH_ADDRESS, senderAddr)).to.equal(wethAmountTotal);
        });

        it('... should open Trove with whole WETH balance as collateral', async () => {
            // eslint-disable-next-line max-len
            await liquityOpen(proxy, maxFeePercentage, hre.ethers.constants.MaxUint256, lusdAmountOpen, senderAddr, senderAddr);

            const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
            expect(collAmount).to.equal(wethAmountTotal);
        });
    });
};

const liquitySupplyTest = async () => {
    describe('Liquity-Supply', function () {
        this.timeout(1000000);

        let wethAmountTotal;
        let collAmountOpen;
        let collAmountSupply;

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let liquityView;

        before(async () => {
            await resetForkToBlock(forkBlokNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityOpen');
            await redeploy('LiquitySupply');

            const priceFeed = await hre.ethers.getContractAt('IPriceFeed', '0x4c517D4e2C851CA76d7eC94B805269Df0f2201De');
            const collPrice = BN2Float(await priceFeed.callStatic.fetchPrice());
            wethAmountTotal = Float2BN(`${wethAmountTotalValue / collPrice}`);
            collAmountOpen = Float2BN(`${collAmountOpenValue / collPrice}`);
            collAmountSupply = Float2BN(`${collAmountSupplyValue / collPrice}`);

            await setBalance(WETH_ADDRESS, senderAddr, wethAmountTotal);
            await approve(WETH_ADDRESS, proxyAddr);
            await approve(lusdAddr, proxyAddr);
        });

        afterEach(async () => {
            // eslint-disable-next-line object-curly-newline
            const { troveStatus, collAmount, debtAmount, collPrice } = await liquityView['getTroveInfo(address)'](proxyAddr);
            console.log(`\tTrove status: ${troveStatus}`);
            // eslint-disable-next-line eqeqeq
            if (troveStatus != 1) {
                console.log('\tTrove not active');
                return;
            }
            const CR = collAmount.mul(collPrice).div(debtAmount);

            console.log(`\tTrove coll:\t${BN2Float(collAmount)} ETH`);
            console.log(`\tTrove debt:\t${BN2Float(debtAmount)} LUSD`);
            console.log(`\tTrove CR:\t${BN2Float(CR.mul(100))}%`);
            console.log(`\tETH price:\t${BN2Float(collPrice)}`);
        });

        it(`... should open Trove with $${collAmountOpenValue} WETH collateral and $${BN2Float(lusdAmountOpen)} LUSD net debt`, async () => {
            // eslint-disable-next-line max-len
            await liquityOpen(proxy, maxFeePercentage, collAmountOpen, lusdAmountOpen, senderAddr, senderAddr);

            const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
            expect(collAmount).to.equal(collAmountOpen);
            expect(await balanceOf(lusdAddr, senderAddr)).to.equal(lusdAmountOpen);
        });

        it(`... should supply additional $${collAmountSupplyValue} WETH of collateral`, async () => {
            await liquitySupply(proxy, collAmountSupply, senderAddr);

            const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
            expect(collAmount).to.equal(collAmountOpen.add(collAmountSupply));
        });

        it('... should supply the rest of available WETH as collateral', async () => {
            await liquitySupply(proxy, hre.ethers.constants.MaxUint256, senderAddr);

            const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
            expect(collAmount).to.equal(wethAmountTotal);
        });
    });
};

const liquityWithdrawTest = async () => {
    describe('Liquity-Withdraw', function () {
        this.timeout(1000000);

        let collAmountOpen;
        let collAmountWithdraw;

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let liquityView;

        before(async () => {
            await resetForkToBlock(forkBlokNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityOpen');
            await redeploy('LiquityWithdraw');

            const priceFeed = await hre.ethers.getContractAt('IPriceFeed', '0x4c517D4e2C851CA76d7eC94B805269Df0f2201De');
            const collPrice = BN2Float(await priceFeed.callStatic.fetchPrice());
            collAmountOpen = Float2BN(`${collAmountOpenValue / collPrice}`);
            collAmountWithdraw = Float2BN(`${collAmountWithdrawValue / collPrice}`);

            await setBalance(WETH_ADDRESS, senderAddr, collAmountOpen);
            await approve(WETH_ADDRESS, proxyAddr);
            await approve(lusdAddr, proxyAddr);
        });

        afterEach(async () => {
            // eslint-disable-next-line object-curly-newline
            const { troveStatus, collAmount, debtAmount, collPrice } = await liquityView['getTroveInfo(address)'](proxyAddr);
            console.log(`\tTrove status: ${troveStatus}`);
            // eslint-disable-next-line eqeqeq
            if (troveStatus != 1) {
                console.log('\tTrove not active');
                return;
            }
            const CR = collAmount.mul(collPrice).div(debtAmount);

            console.log(`\tTrove coll:\t${BN2Float(collAmount)} ETH`);
            console.log(`\tTrove debt:\t${BN2Float(debtAmount)} LUSD`);
            console.log(`\tTrove CR:\t${BN2Float(CR.mul(100))}%`);
            console.log(`\tETH price:\t${BN2Float(collPrice)}`);
        });

        it(`... should open Trove with $${collAmountOpenValue} WETH collateral and $${BN2Float(lusdAmountOpen)} LUSD net debt`, async () => {
            // eslint-disable-next-line max-len
            await liquityOpen(proxy, maxFeePercentage, collAmountOpen, lusdAmountOpen, senderAddr, senderAddr);

            const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
            expect(collAmount).to.equal(collAmountOpen);
            expect(await balanceOf(lusdAddr, senderAddr)).to.equal(lusdAmountOpen);
        });

        it(`... should withdraw ${collAmountWithdrawValue} WETH from collateral`, async () => {
            await liquityWithdraw(proxy, collAmountWithdraw, senderAddr);
            expect(await balanceOf(WETH_ADDRESS, senderAddr)).to.equal(collAmountWithdraw);
        });
    });
};

const liquityBorrowTest = async () => {
    describe('Liquity-Borrow', function () {
        this.timeout(1000000);

        let collAmountOpen;

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let liquityView;

        before(async () => {
            await resetForkToBlock(forkBlokNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityOpen');
            await redeploy('LiquityBorrow');

            const priceFeed = await hre.ethers.getContractAt('IPriceFeed', '0x4c517D4e2C851CA76d7eC94B805269Df0f2201De');
            const collPrice = BN2Float(await priceFeed.callStatic.fetchPrice());
            collAmountOpen = Float2BN(`${collAmountOpenValue / collPrice}`);

            await setBalance(WETH_ADDRESS, senderAddr, collAmountOpen);
            await approve(WETH_ADDRESS, proxyAddr);
        });

        afterEach(async () => {
            // eslint-disable-next-line object-curly-newline
            const { troveStatus, collAmount, debtAmount, collPrice } = await liquityView['getTroveInfo(address)'](proxyAddr);
            console.log(`\tTrove status: ${troveStatus}`);
            // eslint-disable-next-line eqeqeq
            if (troveStatus != 1) {
                console.log('\tTrove not active');
                return;
            }
            const CR = collAmount.mul(collPrice).div(debtAmount);

            console.log(`\tTrove coll:\t${BN2Float(collAmount)} ETH`);
            console.log(`\tTrove debt:\t${BN2Float(debtAmount)} LUSD`);
            console.log(`\tTrove CR:\t${BN2Float(CR.mul(100))}%`);
            console.log(`\tETH price:\t${BN2Float(collPrice)}`);
        });

        it(`... should open Trove with $${collAmountOpenValue} WETH collateral and $${BN2Float(lusdAmountOpen)} LUSD debt`, async () => {
            // eslint-disable-next-line max-len
            await liquityOpen(proxy, maxFeePercentage, collAmountOpen, lusdAmountOpen, senderAddr, senderAddr);

            const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);

            expect(collAmount).to.equal(collAmountOpen);
            expect(await balanceOf(lusdAddr, senderAddr)).to.equal(lusdAmountOpen);
        });

        it(`... should borrow additional $${BN2Float(lusdAmountBorrow)} LUSD`, async () => {
            await liquityBorrow(proxy, maxFeePercentage, lusdAmountBorrow, senderAddr);

            const lusdBalance = await balanceOf(lusdAddr, senderAddr);
            expect(lusdBalance).to.equal(lusdAmountBorrow.add(lusdAmountOpen));
        });
    });
};

const liqiutyPaybackTest = async () => {
    describe('Liquity-Payback', function () {
        this.timeout(1000000);

        let collAmountOpen;

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let liquityView;

        before(async () => {
            await resetForkToBlock(forkBlokNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityOpen');
            await redeploy('LiquityPayback');

            const priceFeed = await hre.ethers.getContractAt('IPriceFeed', '0x4c517D4e2C851CA76d7eC94B805269Df0f2201De');
            const collPrice = BN2Float(await priceFeed.callStatic.fetchPrice());
            collAmountOpen = Float2BN(`${collAmountOpenValue / collPrice}`, 18);

            await setBalance(WETH_ADDRESS, senderAddr, collAmountOpen);
            await approve(WETH_ADDRESS, proxyAddr);
            await approve(lusdAddr, proxyAddr);
        });

        afterEach(async () => {
            // eslint-disable-next-line object-curly-newline
            const { troveStatus, collAmount, debtAmount, collPrice } = await liquityView['getTroveInfo(address)'](proxyAddr);
            console.log(`\tTrove status: ${troveStatus}`);
            // eslint-disable-next-line eqeqeq
            if (troveStatus != 1) {
                console.log('\tTrove not active');
                return;
            }
            const CR = collAmount.mul(collPrice).div(debtAmount);

            console.log(`\tTrove coll:\t${BN2Float(collAmount)} ETH`);
            console.log(`\tTrove debt:\t${BN2Float(debtAmount)} LUSD`);
            console.log(`\tTrove CR:\t${BN2Float(CR.mul(100))}%`);
            console.log(`\tETH price:\t${BN2Float(collPrice)}`);
        });

        it(`... should open Trove with $${collAmountOpenValue} WETH collateral and $${BN2Float(lusdAmountOpen)} LUSD net debt`, async () => {
            // eslint-disable-next-line max-len
            await liquityOpen(proxy, maxFeePercentage, collAmountOpen, lusdAmountOpen, senderAddr, senderAddr);

            const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
            expect(collAmount).to.equal(collAmountOpen);
            expect(await balanceOf(lusdAddr, senderAddr)).to.equal(lusdAmountOpen);
        });

        it(`... should payback $${BN2Float(lusdAmountPayback)} LUSD of debt`, async () => {
            const debtBefore = (await liquityView['getTroveInfo(address)'](proxyAddr)).debtAmount;

            await liquityPayback(proxy, lusdAmountPayback, senderAddr);

            const debtAfter = (await liquityView['getTroveInfo(address)'](proxyAddr)).debtAmount;
            expect(debtBefore.sub(debtAfter)).to.equal(lusdAmountPayback);
        });
    });
};

const liquityCloseTest = async () => {
    describe('Liquity-Close', function () {
        this.timeout(1000000);

        let collAmountOpen;

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let liquityView;

        before(async () => {
            await resetForkToBlock(forkBlokNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityOpen');
            await redeploy('LiquityClose');

            const priceFeed = await hre.ethers.getContractAt('IPriceFeed', '0x4c517D4e2C851CA76d7eC94B805269Df0f2201De');
            const collPrice = BN2Float(await priceFeed.callStatic.fetchPrice());
            collAmountOpen = Float2BN(`${collAmountOpenValue / collPrice}`);

            await setBalance(WETH_ADDRESS, senderAddr, collAmountOpen);
            await setBalance(lusdAddr, senderAddr, lusdAmountFee);
            await approve(WETH_ADDRESS, proxyAddr);
            await approve(lusdAddr, proxyAddr);
        });

        afterEach(async () => {
            // eslint-disable-next-line object-curly-newline
            const { troveStatus, collAmount, debtAmount, collPrice } = await liquityView['getTroveInfo(address)'](proxyAddr);
            console.log(`\tTrove status: ${troveStatus}`);
            // eslint-disable-next-line eqeqeq
            if (troveStatus != 1) {
                console.log('\tTrove not active');
                return;
            }
            const CR = collAmount.mul(collPrice).div(debtAmount);

            console.log(`\tTrove coll:\t${BN2Float(collAmount)} ETH`);
            console.log(`\tTrove debt:\t${BN2Float(debtAmount)} LUSD`);
            console.log(`\tTrove CR:\t${BN2Float(CR.mul(100))}%`);
            console.log(`\tETH price:\t${BN2Float(collPrice)}`);
        });

        it(`... should open Trove with $${collAmountOpenValue} WETH collateral and $${BN2Float(lusdAmountOpen)} LUSD net debt`, async () => {
            // eslint-disable-next-line max-len
            await liquityOpen(proxy, maxFeePercentage, collAmountOpen, lusdAmountOpen, senderAddr, senderAddr);

            const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
            expect(collAmount).to.equal(collAmountOpen);
            // eslint-disable-next-line max-len
            expect(await balanceOf(lusdAddr, senderAddr)).to.equal(lusdAmountOpen.add(lusdAmountFee));
        });

        it('... should close Trove', async () => {
            await liquityClose(proxy, senderAddr, senderAddr);
            expect(await balanceOf(WETH_ADDRESS, senderAddr)).to.equal(collAmountOpen);
        });
    });
};

const liquitySPDepositTest = async () => {
    describe('Liquity-SP-Deposit', function () {
        this.timeout(1000000);

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let liquityView;

        before(async () => {
            await resetForkToBlock();

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquitySPDeposit');

            setBalance(lusdAddr, senderAddr, lusdAmountTotal);
            await approve(lusdAddr, proxyAddr);
        });

        afterEach(async () => {
            // eslint-disable-next-line object-curly-newline
            const { compoundedLUSD, ethGain, lqtyGain } = await liquityView['getDepositorInfo(address)'](proxyAddr);

            console.log(`\tCompounded deposit:\t${BN2Float(compoundedLUSD)} LUSD`);
            console.log(`\tETH gain:\t${BN2Float(ethGain)} ETH`);
            console.log(`\tLQTY gain:\t${BN2Float(lqtyGain)} LQTY`);
        });

        it(`... should deposit ${BN2Float(lusdAmountDeposit)} LUSD to the stability pool`, async () => {
            await liquitySPDeposit(proxy, lusdAmountDeposit, senderAddr, proxyAddr, proxyAddr);

            const { compoundedLUSD } = await liquityView['getDepositorInfo(address)'](proxyAddr);
            expect(compoundedLUSD).to.be.equal(lusdAmountDeposit);
        });

        it('... should deposit the remainder of available LUSD', async () => {
            // const wethBalance = await balanceOf(WETH_ADDRESS, proxyAddr);
            // const lqtyBalance = await balanceOf(lqtyAddr, proxyAddr);
            // eslint-disable-next-line max-len
            // const { ethGain, lqtyGain } = await liquityView['getDepositorInfo(address)'](proxyAddr);

            // eslint-disable-next-line max-len
            await liquitySPDeposit(proxy, hre.ethers.constants.MaxUint256, senderAddr, proxyAddr, proxyAddr);

            const { compoundedLUSD } = await liquityView['getDepositorInfo(address)'](proxyAddr);
            expect(compoundedLUSD).to.be.equal(lusdAmountTotal);

            // const wethChange = (await balanceOf(WETH_ADDRESS, proxyAddr)).sub(wethBalance);
            // const lqtyChange = (await balanceOf(lqtyAddr, proxyAddr)).sub(lqtyBalance);
            // expect(ethGain).to.be.equal(wethChange);
            // expect(lqtyGain).to.be.equal(lqtyChange);
        });
    });
};

const liquitySPWithdrawTest = async () => {
    describe('Liquity-SP-Withdraw', function () {
        this.timeout(1000000);

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let liquityView;

        before(async () => {
            await resetForkToBlock();

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquitySPDeposit');
            await redeploy('LiquitySPWithdraw');

            await setBalance(lusdAddr, senderAddr, lusdAmountTotal);
            await approve(lusdAddr, proxyAddr);
        });

        afterEach(async () => {
            // eslint-disable-next-line object-curly-newline
            const { compoundedLUSD, ethGain, lqtyGain } = await liquityView['getDepositorInfo(address)'](proxyAddr);

            console.log(`\tCompounded deposit:\t${BN2Float(compoundedLUSD)} LUSD`);
            console.log(`\tETH gain:\t${BN2Float(ethGain)} ETH`);
            console.log(`\tLQTY gain:\t${BN2Float(lqtyGain)} LQTY`);
        });

        it(`... should deposit ${BN2Float(lusdAmountTotal)} LUSD to the stability pool`, async () => {
            await liquitySPDeposit(proxy, lusdAmountTotal, senderAddr, proxyAddr, proxyAddr);

            const { compoundedLUSD } = await liquityView['getDepositorInfo(address)'](proxyAddr);
            expect(compoundedLUSD).to.be.equal(lusdAmountTotal);
        });

        it(`... should withdraw ${BN2Float(lusdAmountWithdraw)}`, async () => {
            // const wethBalance = await balanceOf(WETH_ADDRESS, proxyAddr);
            // const lqtyBalance = await balanceOf(lqtyAddr, proxyAddr);
            // eslint-disable-next-line max-len
            // const { ethGain, lqtyGain } = await liquityView['getDepositorInfo(address)'](proxyAddr);

            await liquitySPWithdraw(proxy, lusdAmountWithdraw, senderAddr, proxyAddr, proxyAddr);

            const lusdBalance = await balanceOf(lusdAddr, senderAddr);
            expect(lusdBalance).to.be.equal(lusdAmountWithdraw);

            // const wethChange = (await balanceOf(WETH_ADDRESS, proxyAddr)).sub(wethBalance);
            // const lqtyChange = (await balanceOf(lqtyAddr, proxyAddr)).sub(lqtyBalance);
            // expect(ethGain).to.be.equal(wethChange);
            // expect(lqtyGain).to.be.equal(lqtyChange);
        });

        it('... should withdraw the rest of the deposited LUSD', async () => {
            // const wethBalance = await balanceOf(WETH_ADDRESS, proxyAddr);
            // const lqtyBalance = await balanceOf(lqtyAddr, proxyAddr);
            // eslint-disable-next-line max-len
            // const { ethGain, lqtyGain } = await liquityView['getDepositorInfo(address)'](proxyAddr);

            // eslint-disable-next-line max-len
            await liquitySPWithdraw(proxy, hre.ethers.constants.MaxUint256, senderAddr, proxyAddr, proxyAddr);

            const lusdBalance = await balanceOf(lusdAddr, senderAddr);
            expect(lusdBalance).to.be.equal(lusdAmountTotal);

            // const wethChange = (await balanceOf(WETH_ADDRESS, proxyAddr)).sub(wethBalance);
            // const lqtyChange = (await balanceOf(lqtyAddr, proxyAddr)).sub(lqtyBalance);
            // expect(ethGain).to.be.equal(wethChange);
            // expect(lqtyGain).to.be.equal(lqtyChange);
        });
    });
};

const liquityEthGainToTroveTest = async () => {
    describe('Liquity-ETH-Gain-To-Trove', function () {
        this.timeout(1000000);

        let wethAmountOpen;

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let liquityView;

        before(async () => {
            await resetForkToBlock(forkBlokNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityOpen');
            await redeploy('LiquitySPDeposit');
            await redeploy('LiquityEthGainToTrove');

            const priceFeed = await hre.ethers.getContractAt('IPriceFeed', '0x4c517D4e2C851CA76d7eC94B805269Df0f2201De');
            const collPrice = BN2Float(await priceFeed.callStatic.fetchPrice());
            wethAmountOpen = Float2BN(`${wethAmountOpenValue / collPrice}`);

            await setBalance(WETH_ADDRESS, senderAddr, wethAmountOpen);
            await approve(WETH_ADDRESS, proxyAddr);
            await approve(lusdAddr, proxyAddr);
        });

        afterEach(async () => {
            // eslint-disable-next-line object-curly-newline
            const { troveStatus, collAmount, debtAmount, collPrice } = await liquityView['getTroveInfo(address)'](proxyAddr);
            console.log(`\tTrove status: ${troveStatus}`);
            // eslint-disable-next-line eqeqeq
            if (troveStatus != 1) {
                console.log('\tTrove not active');
                return;
            }
            const CR = collAmount.mul(collPrice).div(debtAmount);

            console.log(`\tTrove coll:\t${BN2Float(collAmount)} ETH`);
            console.log(`\tTrove debt:\t${BN2Float(debtAmount)} LUSD`);
            console.log(`\tTrove CR:\t${BN2Float(CR.mul(100))}%`);
            console.log(`\tETH price:\t${BN2Float(collPrice)}`);

            const { compoundedLUSD, ethGain, lqtyGain } = await liquityView['getDepositorInfo(address)'](proxyAddr);

            console.log(`\tCompounded deposit:\t${BN2Float(compoundedLUSD)} LUSD`);
            console.log(`\tETH gain:\t${BN2Float(ethGain)} ETH`);
            console.log(`\tLQTY gain:\t${BN2Float(lqtyGain)} LQTY`);
        });

        it(`... should open a Trove with $${wethAmountOpenValue} WETH collateral and $${BN2Float(lusdAmountOpen)} LUSD net debt`, async () => {
            await liquityOpen(proxy, Float2BN('0.05'), wethAmountOpen, lusdAmountOpen, senderAddr, senderAddr);
        });

        it(`... should deposit $${BN2Float(lusdAmountOpen)} LUSD to the stability pool`, async () => {
            await liquitySPDeposit(proxy, lusdAmountOpen, senderAddr, proxyAddr, proxyAddr);

            const { compoundedLUSD } = await liquityView['getDepositorInfo(address)'](proxyAddr);
            expect(compoundedLUSD).to.be.equal(lusdAmountOpen);
        });

        it('... should withdraw ETH gain to the users trove', async () => {
            const { collAmount } = await liquityView['getTroveInfo(address)'](proxyAddr);
            const lqtyAmount = await balanceOf(lqtyAddr, proxyAddr);
            const { ethGain, lqtyGain } = await liquityView['getDepositorInfo(address)'](proxyAddr);

            if (ethGain.isZero()) return;
            // reverts if gain is 0
            // TODO figure out how to test this

            await liquityEthGainToTrove(proxy, proxyAddr);

            const collChange = (await liquityView['getTroveInfo(address)'](proxyAddr)).collAmount.sub(collAmount);
            const lqtyChange = (await balanceOf(lqtyAddr, proxyAddr)).sub(lqtyAmount);
            expect(ethGain).to.be.equal(collChange);
            expect(lqtyGain).to.be.equal(lqtyChange);
        });
    });
};

const liquityStakeTest = async () => {
    describe('Liquity-Stake', function () {
        this.timeout(1000000);

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let liquityView;

        before(async () => {
            await resetForkToBlock();

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityStake');

            await setBalance(lqtyAddr, senderAddr, lqtyAmountTotal);
            await approve(lqtyAddr, proxyAddr);
        });

        afterEach(async () => {
            // eslint-disable-next-line object-curly-newline
            const { stake, ethGain, lusdGain } = await liquityView['getStakeInfo(address)'](proxyAddr);

            console.log(`\tStake:\t${BN2Float(stake)} LQTY`);
            console.log(`\tETH gain:\t${BN2Float(ethGain)} ETH`);
            console.log(`\tLUSD gain:\t${BN2Float(lusdGain)} LUSD`);
        });

        it(`... should deposit ${BN2Float(lqtyAmountStake)} LQTY to the staking contract`, async () => {
            // eslint-disable-next-line max-len
            await liquityStake(proxy, lqtyAmountStake, senderAddr, proxyAddr, proxyAddr);

            const { stake } = await liquityView['getStakeInfo(address)'](proxyAddr);
            expect(stake).to.be.equal(lqtyAmountStake);
        });

        it('... should deposit the remainder of available LQTY', async () => {
            const wethBalance = await balanceOf(WETH_ADDRESS, proxyAddr);
            const lusdBalance = await balanceOf(lusdAddr, proxyAddr);
            const { ethGain, lusdGain } = await liquityView['getStakeInfo(address)'](proxyAddr);

            // eslint-disable-next-line max-len
            await liquityStake(proxy, hre.ethers.constants.MaxUint256, senderAddr, proxyAddr, proxyAddr);

            const { stake } = await liquityView['getStakeInfo(address)'](proxyAddr);
            expect(stake).to.be.equal(lqtyAmountTotal);

            const wethChange = (await balanceOf(WETH_ADDRESS, proxyAddr)).sub(wethBalance);
            const lusdChange = (await balanceOf(lusdAddr, proxyAddr)).sub(lusdBalance);
            expect(wethChange).to.be.equal(ethGain);
            expect(lusdChange).to.be.equal(lusdGain);
        });
    });
};

const liquityUnstakeTest = async () => {
    describe('Liquity-Unstake', function () {
        this.timeout(1000000);

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let liquityView;

        before(async () => {
            await resetForkToBlock();

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            liquityView = await redeploy('LiquityView');
            await redeploy('LiquityStake');
            await redeploy('LiquityUnstake');

            await setBalance(lqtyAddr, senderAddr, lqtyAmountStake);
            await approve(lqtyAddr, proxyAddr);
        });

        afterEach(async () => {
            // eslint-disable-next-line object-curly-newline
            const { stake, ethGain, lusdGain } = await liquityView['getStakeInfo(address)'](proxyAddr);

            console.log(`\tStake:\t${BN2Float(stake)} LQTY`);
            console.log(`\tETH gain:\t${BN2Float(ethGain)} ETH`);
            console.log(`\tLUSD gain:\t${BN2Float(lusdGain)} LUSD`);
        });

        it(`... should deposit ${BN2Float(lqtyAmountStake)} LQTY to the staking contract`, async () => {
            // eslint-disable-next-line max-len
            await liquityStake(proxy, lqtyAmountStake, senderAddr, proxyAddr, proxyAddr);

            const { stake } = await liquityView['getStakeInfo(address)'](proxyAddr);
            expect(stake).to.be.equal(lqtyAmountStake);
        });

        it(`... should withdraw ${BN2Float(lqtyAmountUnstake)} LQTY from the staking contract`, async () => {
            const wethBalance = await balanceOf(WETH_ADDRESS, proxyAddr);
            const lusdBalance = await balanceOf(lusdAddr, proxyAddr);
            const { ethGain, lusdGain } = await liquityView['getStakeInfo(address)'](proxyAddr);

            // eslint-disable-next-line max-len
            await liquityUnstake(proxy, lqtyAmountUnstake, senderAddr, proxyAddr, proxyAddr);

            const lqtyBalance = await balanceOf(lqtyAddr, senderAddr);
            expect(lqtyBalance).to.be.eq(lqtyAmountUnstake);

            const { stake } = await liquityView['getStakeInfo(address)'](proxyAddr);
            expect(stake).to.be.equal(lqtyAmountStake.sub(lqtyAmountUnstake));

            const wethChange = (await balanceOf(WETH_ADDRESS, proxyAddr)).sub(wethBalance);
            const lusdChange = (await balanceOf(lusdAddr, proxyAddr)).sub(lusdBalance);
            expect(wethChange).to.be.equal(ethGain);
            expect(lusdChange).to.be.equal(lusdGain);
        });

        it('... should withdraw all staked LQTY from the staking contract', async () => {
            const wethBalance = await balanceOf(WETH_ADDRESS, proxyAddr);
            const lusdBalance = await balanceOf(lusdAddr, proxyAddr);
            const { ethGain, lusdGain } = await liquityView['getStakeInfo(address)'](proxyAddr);

            // eslint-disable-next-line max-len
            await liquityUnstake(proxy, hre.ethers.constants.MaxUint256, senderAddr, proxyAddr, proxyAddr);

            const lqtyBalance = await balanceOf(lqtyAddr, senderAddr);
            expect(lqtyBalance).to.be.eq(lqtyAmountStake);

            const wethChange = (await balanceOf(WETH_ADDRESS, proxyAddr)).sub(wethBalance);
            const lusdChange = (await balanceOf(lusdAddr, proxyAddr)).sub(lusdBalance);
            expect(wethChange).to.be.equal(ethGain);
            expect(lusdChange).to.be.equal(lusdGain);
        });
    });
};

const liquityRedeemTest = async () => {
    describe('Liquity-Redeem', function () {
        this.timeout(1000000);

        let senderAcc; let senderAddr;
        let proxy; let proxyAddr;
        let ethRedeemed;

        before(async () => {
            await resetForkToBlock(forkBlokNum);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAddr = senderAcc.address;
            proxy = await getProxy(senderAcc.address);
            proxyAddr = proxy.address;

            await redeploy('LiquityRedeem');
            await redeploy('LiquityView');

            await setBalance(lusdAddr, senderAddr, lusdAmountTotal);
            await approve(lusdAddr, proxyAddr);
        });

        afterEach(async () => {
            console.log(`\tWETH balance: ${BN2Float(await balanceOf(WETH_ADDRESS, senderAddr))}`);
            console.log(`\tLUSD balance: ${BN2Float(await balanceOf(lusdAddr, senderAddr))}`);
        });

        it(`... should redeem ${BN2Float(lusdAmountRedeem)} LUSD worth of ETH`, async () => {
            // eslint-disable-next-line max-len
            await liquityRedeem(proxy, lusdAmountRedeem, senderAddr, senderAddr, maxFeePercentage);
            ethRedeemed = await balanceOf(WETH_ADDRESS, senderAddr);
            expect(ethRedeemed).to.be.gt(0);
        });

        it('... should redeem using the whole LUSD balance', async () => {
            // eslint-disable-next-line max-len
            await liquityRedeem(proxy, hre.ethers.constants.MaxUint256, senderAddr, senderAddr, maxFeePercentage);
            const wethBalance = await balanceOf(WETH_ADDRESS, senderAddr);
            expect(wethBalance).to.be.gt(ethRedeemed);
        });
    });
};

const liquityFullTest = async () => {
    await liquityOpenTest();
    await liquitySupplyTest();
    await liquityWithdrawTest();
    await liquityBorrowTest();
    await liqiutyPaybackTest();
    await liquityCloseTest();

    await liquitySPDepositTest();
    await liquitySPWithdrawTest();
    await liquityEthGainToTroveTest();

    await liquityStakeTest();
    await liquityUnstakeTest();

    await liquityRedeemTest();
};

module.exports = {
    liquityFullTest,

    liquityOpenTest,
    liquitySupplyTest,
    liquityWithdrawTest,
    liquityBorrowTest,
    liqiutyPaybackTest,
    liquityCloseTest,

    liquitySPDepositTest,
    liquitySPWithdrawTest,
    liquityEthGainToTroveTest,

    liquityStakeTest,
    liquityUnstakeTest,

    liquityRedeemTest,
};
