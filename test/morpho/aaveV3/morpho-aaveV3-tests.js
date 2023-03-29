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
    REGISTRY_ADDR,
} = require('../../utils');

const {
    morphoAaveV3Supply,
} = require('../../actions');

const EMODE = {
    GENERAL: 0,
    ETH: 1,
};

const morphoAaveV3SupplyTest = async () => {
    describe('Morpho-AaveV3-Supply', function () {
        this.timeout(80000);

        const testData = [
            {
                tokenSymbol: 'WETH', amount: '10', emode: EMODE.GENERAL, isCollateral: false,
            },
            {
                tokenSymbol: 'WETH', amount: '10', emode: EMODE.GENERAL, isCollateral: true,
            },
        ];

        let senderAcc;
        let proxy;
        let snapshot;

        beforeEach(async () => {
            snapshot = await takeSnapshot();
            console.log(`Snapshot: ${snapshot}`);
        });

        afterEach(async () => {
            await revertToSnapshot(snapshot);
        });

        before(async () => {
            await redeploy('MorphoAaveV3Supply', REGISTRY_ADDR, true, true);

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        for (let i = 0; i < testData.length; i++) {
            const {
                tokenSymbol, amount, emode, isCollateral,
            } = testData[i];

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
                    0,
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
            await resetForkToBlock();

            await redeploy('MorphoAaveV3Withdraw');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
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

            await redeploy('MorphoAaveV3Borrow');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
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

            await redeploy('MorphoAaveV3Payback');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
    });
};

module.exports = {
    morphoAaveV3SupplyTest,
    morphoAaveV3WithdrawTest,
    morphoAaveV3BorrowTest,
    morphoAaveV3PaybackTest,
};
