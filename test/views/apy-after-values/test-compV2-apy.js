/* eslint-disable max-len */
const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const {
    getProxy,
    takeSnapshot,
    revertToSnapshot,
    redeploy,
    fetchAmountinUSDPrice,
} = require('../../utils');
const {
    supplyComp, borrowComp, paybackComp, withdrawComp,
} = require('../../actions');

const COMPTROLLER_ADDR = '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B';
const cTokens = {
    WETH: '0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5',
    WBTC: '0xccF4429DB6322D5C611ee964527D42E5d685DD6a',
    DAI: '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643',
    USDC: '0x39AA39c021dfbaE8faC545936693aC917d5E7563',
};

const compV2ApyAfterValuesTest = async () => {
    describe('Test Compound V2 apy after values', async () => {
        let senderAcc;
        let wallet;
        let snapshotId;
        let compV2ViewContract;
        const cantSupplyTokens = {};
        const cantBorrowTokens = {};

        before(async () => {
            [senderAcc] = await hre.ethers.getSigners();
            wallet = await getProxy(senderAcc.address);
            compV2ViewContract = await redeploy('CompView');
            const tokenInfos = await compV2ViewContract.callStatic.getFullTokensInfo(Object.values(cTokens));
            tokenInfos.forEach((tokenInfo, index) => {
                if (!tokenInfo.canMint) {
                    cantSupplyTokens[Object.keys(cTokens)[index]] = true;
                }
                if (!tokenInfo.canBorrow) {
                    cantBorrowTokens[Object.keys(cTokens)[index]] = true;
                }
            });
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        for (let i = 0; i < Object.keys(cTokens).length; i++) {
            for (let j = 0; j < Object.keys(cTokens).length; j++) {
                if (i === j || cantSupplyTokens[Object.keys(cTokens)[i]] || cantBorrowTokens[Object.keys(cTokens)[j]]) {
                    // eslint-disable-next-line no-continue
                    continue;
                }
                const collAsset = getAssetInfo(Object.keys(cTokens)[i]);
                const collCToken = cTokens[collAsset.symbol];

                const borrowAsset = getAssetInfo(Object.keys(cTokens)[j]);
                const borrowCToken = cTokens[borrowAsset.symbol];

                it(`... should estimate supply and borrow rates when opening position [coll: ${collAsset.symbol} debt: ${borrowAsset.symbol}]`, async () => {
                    const collCTokenContract = await hre.ethers.getContractAt('ICToken', collCToken);
                    const borrowCTokenContract = await hre.ethers.getContractAt('ICToken', borrowCToken);
                    const comptroller = await hre.ethers.getContractAt('IComptroller', COMPTROLLER_ADDR);

                    const maxBorrowCap = await comptroller.borrowCaps(borrowCToken);

                    const supplyAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(collAsset.symbol, '100000'),
                        collAsset.decimals,
                    );
                    let borrowAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(borrowAsset.symbol, '40000'),
                        borrowAsset.decimals,
                    );

                    if (borrowAmount.gt(maxBorrowCap)) {
                        borrowAmount = maxBorrowCap.div(2);
                    }

                    const paybackAmount = borrowAmount.div(10);
                    const withdrawAmount = supplyAmount.div(10);

                    const params = [
                        {
                            cTokenAddr: collCToken,
                            isBorrowOperation: false,
                            liquidityAdded: supplyAmount,
                            liquidityTaken: withdrawAmount,
                        },
                        {
                            cTokenAddr: borrowCToken,
                            isBorrowOperation: true,
                            liquidityAdded: paybackAmount,
                            liquidityTaken: borrowAmount,
                        },
                    ];

                    const result = await compV2ViewContract.callStatic.getApyAfterValuesEstimation(params);

                    const estimatedStateAfter = {
                        collAssetSupplyRate: result[0].supplyRate,
                        collAssetBorrowRate: result[0].borrowRate,
                        borrowAssetSupplyRate: result[1].supplyRate,
                        borrowAssetBorrowRate: result[1].borrowRate,
                    };

                    await supplyComp(
                        wallet,
                        collCToken,
                        collAsset.address,
                        supplyAmount,
                        senderAcc.address,
                    );
                    await borrowComp(
                        wallet,
                        borrowCToken,
                        borrowAmount,
                        senderAcc.address,
                    );
                    await paybackComp(
                        wallet,
                        borrowCToken,
                        borrowAsset.address,
                        paybackAmount,
                        senderAcc.address,
                    );
                    await withdrawComp(
                        wallet,
                        collCToken,
                        withdrawAmount,
                        senderAcc.address,
                    );

                    const stateAfter = {
                        collAssetSupplyRate: await collCTokenContract.callStatic.supplyRatePerBlock(),
                        collAssetBorrowRate: await collCTokenContract.callStatic.borrowRatePerBlock(),
                        borrowAssetSupplyRate: await borrowCTokenContract.callStatic.supplyRatePerBlock(),
                        borrowAssetBorrowRate: await borrowCTokenContract.callStatic.borrowRatePerBlock(),
                    };

                    // tolerate up to 6 last decimal places in difference
                    expect(stateAfter.collAssetSupplyRate).to.be.closeTo(estimatedStateAfter.collAssetSupplyRate, 1e6);
                    expect(stateAfter.collAssetBorrowRate).to.be.closeTo(estimatedStateAfter.collAssetBorrowRate, 1e6);
                    expect(stateAfter.borrowAssetSupplyRate).to.be.closeTo(estimatedStateAfter.borrowAssetSupplyRate, 1e6);
                    expect(stateAfter.borrowAssetBorrowRate).to.be.closeTo(estimatedStateAfter.borrowAssetBorrowRate, 1e6);
                });
            }
        }
    });
};

describe('CompV2-apy-after-values', () => {
    it('... should test CompoundV2 APY after values', async () => {
        await compV2ApyAfterValuesTest();
    });
});

module.exports = {
    compV2ApyAfterValuesTest,
};
