const { getAssetInfo } = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const hre = require('hardhat');

const {
    getProxy,
    takeSnapshot,
    revertToSnapshot,
    setBalance,
    approve,
    WETH_ADDRESS,
    redeploy,
} = require('../../utils');

const {
    morphoAaveV3Supply,
    morphoAaveV3Withdraw,
    morphoAaveV3Borrow,
    morphoAaveV3Payback,
    executeAction,
} = require('../../actions');

const EMODE = {
    GENERAL: 0,
    ETH: 1,
};

const supplyTestData = [
    {
        tokenSymbol: 'WETH', amount: '100', emode: EMODE.ETH, isCollateral: false,
    },
    {
        tokenSymbol: 'wstETH', amount: '5', emode: EMODE.ETH, isCollateral: true,
    },
    {
        tokenSymbol: 'DAI', amount: '10000', emode: EMODE.ETH, isCollateral: true,
    },
    {
        tokenSymbol: 'USDC', amount: '10000', emode: EMODE.ETH, isCollateral: true,
    },
    {
        tokenSymbol: 'WBTC', amount: '2', emode: EMODE.ETH, isCollateral: true,
    },
];

const morphoAaveV3SupplyTest = async () => {
    describe('Morpho-AaveV3-Supply', function () {
        this.timeout(80000);

        let senderAcc;
        let proxy;
        let snapshot;
        let view;

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        before(async () => {
            view = await redeploy('MorphoAaveV3View');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let i = 0; i < supplyTestData.length; i++) {
            const {
                tokenSymbol, amount, emode, isCollateral,
            } = supplyTestData[i];

            it(`should supply ${amount} ${tokenSymbol} to MorphoAaveV3, emode: ${emode}, coll: ${isCollateral}`, async () => {
                const token = getAssetInfo(tokenSymbol);

                const amountFormatted = hre.ethers.utils.parseUnits(amount, token.decimals);

                await setBalance(token.address, senderAcc.address, amountFormatted);
                await approve(token.address, proxy.address);

                await morphoAaveV3Supply(
                    proxy,
                    emode,
                    token.address,
                    amountFormatted,
                    senderAcc.address,
                    proxy.address,
                    isCollateral,
                    4,
                );
                const morpho = await view.getMorphoAddressByEmode(1);
                const userInfo = await view.getUserInfo(morpho, proxy.address);

                // seems to be one wei off
                if (isCollateral) {
                    // eslint-disable-next-line max-len
                    expect(userInfo[2][i].collateralBalance).to.be.closeTo(amountFormatted, 1);
                } else {
                    expect(userInfo[2][i].supplyBalance).to.be.closeTo(amountFormatted, 1);
                }
            });
        }
    });
};

const morphoAaveV3SetManagerTest = async () => {
    describe('Morpho-AaveV3-SetManager', function () {
        this.timeout(80000);

        let senderAcc;
        let proxy;
        let snapshot;

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
        it('should approve address to manage MorphoAaveV3 proxy position', async () => {
            const setManagerAction = new dfs.actions.morpho.MorphoAaveV3SetManagerAction(
                EMODE.ETH, senderAcc.address, true,
            );
            const functionData = setManagerAction.encodeForDsProxyCall()[1];

            await executeAction('MorphoAaveV3SetManager', functionData, proxy);
            const morphoAaveV3 = await hre.ethers.getContractAt('IMorphoAaveV3', '0x33333aea097c193e66081E930c33020272b33333');
            const permission = await morphoAaveV3.isManagedBy(proxy.address, senderAcc.address);
            console.log(permission);
            // eslint-disable-next-line no-unused-expressions
            expect(permission).to.be.true;
        });
    });
};
const morphoAaveV3WithdrawTest = async () => {
    describe('Morpho-AaveV3-Withdraw', function () {
        this.timeout(80000);

        let senderAcc;
        let proxy;
        let snapshot;
        let view;

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        before(async () => {
            view = await redeploy('MorphoAaveV3View');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let i = 0; i < supplyTestData.length; i++) {
            const {
                tokenSymbol, amount, emode, isCollateral,
            } = supplyTestData[i];

            it(`should supply ${amount} ${tokenSymbol} to MorphoAaveV3 then withdraw, emode: ${emode}, coll: ${isCollateral}`, async () => {
                const token = getAssetInfo(tokenSymbol);

                const amountFormatted = hre.ethers.utils.parseUnits(amount, token.decimals);

                const amountFirstWithdraw = hre.ethers.utils.parseUnits('0.01', token.decimals);

                await setBalance(token.address, senderAcc.address, amountFormatted);
                await approve(token.address, proxy.address);

                await morphoAaveV3Supply(
                    proxy,
                    emode,
                    token.address,
                    amountFormatted,
                    senderAcc.address,
                    proxy.address,
                    isCollateral,
                    4,
                );

                await morphoAaveV3Withdraw(
                    proxy,
                    emode,
                    token.address,
                    amountFirstWithdraw,
                    senderAcc.address,
                    proxy.address,
                    isCollateral,
                    4,
                );
                const morpho = await view.getMorphoAddressByEmode(1);
                const userInfo = await view.getUserInfo(morpho, proxy.address);
                console.log(userInfo[2][i].collateralBalance);
                console.log(userInfo[2][i].supplyBalance);

                await morphoAaveV3Withdraw(
                    proxy,
                    emode,
                    token.address,
                    hre.ethers.constants.MaxUint256,
                    senderAcc.address,
                    proxy.address,
                    isCollateral,
                    4,
                );
                const userInfoLast = await view.getUserInfo(morpho, proxy.address);

                // seems to be one wei off
                if (isCollateral) {
                    expect(userInfoLast[2][i].collateralBalance).to.be.eq(0);
                } else {
                    expect(userInfoLast[2][i].supplyBalance).to.be.eq(0);
                }
            });
        }
    });
};

const morphoAaveV3BorrowTest = async () => {
    describe('Morpho-AaveV3-Borrow', function () {
        this.timeout(80000);

        let senderAcc;
        let proxy;
        let snapshot;
        let view;

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        before(async () => {
            view = await redeploy('MorphoAaveV3View');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
        for (let i = 0; i < supplyTestData.length; i++) {
            const {
                tokenSymbol, amount, emode, isCollateral,
            } = supplyTestData[i];

            it(`should supply ${amount} ${tokenSymbol} to MorphoAaveV3 and then borrow ETH, emode: ${emode}, coll: ${isCollateral}`, async () => {
                if (!isCollateral) return;
                const token = getAssetInfo(tokenSymbol);

                const amountFormatted = hre.ethers.utils.parseUnits(amount, token.decimals);

                await setBalance(token.address, senderAcc.address, amountFormatted);
                await approve(token.address, proxy.address);

                const borrowAmount = hre.ethers.utils.parseUnits('1', 18);

                await morphoAaveV3Supply(
                    proxy,
                    emode,
                    token.address,
                    amountFormatted,
                    senderAcc.address,
                    proxy.address,
                    isCollateral,
                    4,
                );
                await morphoAaveV3Borrow(
                    proxy,
                    emode,
                    WETH_ADDRESS,
                    borrowAmount,
                    senderAcc.address,
                    proxy.address,
                    4,
                );

                const morpho = await view.getMorphoAddressByEmode(1);
                const userInfo = await view.getUserInfo(morpho, proxy.address);
                expect(userInfo[2][0].borrowBalance).to.be.closeTo(borrowAmount, 1);
            });
        }
    });
};

const morphoAaveV3PaybackTest = async () => {
    describe('Morpho-AaveV3-Payback', function () {
        this.timeout(80000);

        let senderAcc;
        let proxy;
        let snapshot;
        let view;

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        before(async () => {
            view = await redeploy('MorphoAaveV3View');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let i = 0; i < supplyTestData.length; i++) {
            const {
                tokenSymbol, amount, emode, isCollateral,
            } = supplyTestData[i];

            it(`should supply ${amount} ${tokenSymbol} to MorphoAaveV3 and then borrow ETH, emode: ${emode}, coll: ${isCollateral}`, async () => {
                if (!isCollateral) return;
                const token = getAssetInfo(tokenSymbol);

                const amountFormatted = hre.ethers.utils.parseUnits(amount, token.decimals);

                await setBalance(token.address, senderAcc.address, amountFormatted);
                await approve(token.address, proxy.address);

                await morphoAaveV3Supply(
                    proxy,
                    emode,
                    token.address,
                    amountFormatted,
                    senderAcc.address,
                    proxy.address,
                    isCollateral,
                    4,
                );
                await morphoAaveV3Borrow(
                    proxy,
                    emode,
                    WETH_ADDRESS,
                    hre.ethers.utils.parseUnits('1', 18),
                    senderAcc.address,
                    proxy.address,
                    4,
                );
                await setBalance(WETH_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('2', 18));
                await approve(WETH_ADDRESS, proxy.address);

                const morpho = await view.getMorphoAddressByEmode(1);
                const userInfo = await view.getUserInfo(morpho, proxy.address);
                console.log(userInfo[2][0].borrowBalance);

                await morphoAaveV3Payback(
                    proxy,
                    emode,
                    WETH_ADDRESS,
                    hre.ethers.utils.parseUnits('0.5', 18),
                    senderAcc.address,
                    proxy.address,
                );
                const userInfoPartialPayback = await view.getUserInfo(morpho, proxy.address);
                console.log(userInfoPartialPayback[2][0].borrowBalance);

                await morphoAaveV3Payback(
                    proxy,
                    emode,
                    WETH_ADDRESS,
                    hre.ethers.constants.MaxUint256,
                    senderAcc.address,
                    proxy.address,
                );
                const userInfoFullPayback = await view.getUserInfo(morpho, proxy.address);
                expect(userInfoFullPayback[2][0].borrowBalance).to.be.eq(0);
            });
        }
    });
};

module.exports = {
    morphoAaveV3SupplyTest,
    morphoAaveV3WithdrawTest,
    morphoAaveV3BorrowTest,
    morphoAaveV3PaybackTest,
    morphoAaveV3SetManagerTest,
};
