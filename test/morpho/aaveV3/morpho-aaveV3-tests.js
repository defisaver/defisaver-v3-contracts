const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');

const {
    redeploy,
    getProxy,
    takeSnapshot,
    revertToSnapshot,
    resetForkToBlock,
    setBalance,
    approve,
    WETH_ADDRESS,
} = require('../../utils');

const {
    morphoAaveV3Supply,
    morphoAaveV3Withdraw,
    morphoAaveV3Borrow,
    morphoAaveV3Payback,
} = require('../../actions');

const EMODE = {
    GENERAL: 0,
    ETH: 1,
};

const supplyTestData = [
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
    {
        tokenSymbol: 'WETH', amount: '2', emode: EMODE.ETH, isCollateral: false,
    },
];

const morphoAaveV3SupplyTest = async () => {
    describe('Morpho-AaveV3-Supply', function () {
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
            await redeploy('MorphoAaveV3Supply');

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
            });
        }
    });
};

const morphoAaveV3WithdrawTest = async () => {
    describe('Morpho-AaveV3-Withdraw', function () {
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
            await redeploy('MorphoAaveV3Supply');
            await redeploy('MorphoAaveV3Withdraw');

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
                    amountFormatted,
                    senderAcc.address,
                    proxy.address,
                    isCollateral,
                    4,
                );
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

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        before(async () => {
            await resetForkToBlock();
            await redeploy('MorphoAaveV3Supply');
            await redeploy('MorphoAaveV3Borrow');

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
                    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
                    hre.ethers.utils.parseUnits('1', 18),
                    senderAcc.address,
                    proxy.address,
                    4,
                );
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

        beforeEach(async () => {
            snapshot = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        before(async () => {
            await resetForkToBlock();

            await redeploy('MorphoAaveV3Supply');
            await redeploy('MorphoAaveV3Borrow');
            await redeploy('MorphoAaveV3Payback');

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

                await approve(WETH_ADDRESS, proxy.address);

                await morphoAaveV3Payback(
                    proxy,
                    emode,
                    WETH_ADDRESS,
                    hre.ethers.utils.parseUnits('1', 18),
                    senderAcc.address,
                    proxy.address,
                );
            });
        }
    });
};

module.exports = {
    morphoAaveV3SupplyTest,
    morphoAaveV3WithdrawTest,
    morphoAaveV3BorrowTest,
    morphoAaveV3PaybackTest,
};
