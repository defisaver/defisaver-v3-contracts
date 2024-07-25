const hre = require('hardhat');
const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const {
    getProxy,
    takeSnapshot,
    revertToSnapshot,
    chainIds,
    redeploy,
    fetchAmountinUSDPrice,
    addrs,
} = require('../../utils');
const { supplyCompV3, borrowCompV3 } = require('../../actions');

const network = hre.network.config.name;
const chainId = chainIds[network];

const compV3Markets = {
    mainnet: [
        {
            baseAsset: 'USDC',
            collaterals: ['WETH', 'WBTC', 'COMP', 'LINK', 'UNI'],
            market: addrs.mainnet.COMET_USDC_ADDR,
        },
        {
            baseAsset: 'WETH',
            collaterals: ['wstETH', 'rETH', 'cbETH'],
            market: addrs.mainnet.COMET_ETH_ADDR,
        },
    ],
    arbitrum: [
        {
            baseAsset: 'USDC',
            collaterals: ['WBTC', 'WETH', 'ARB', 'GMX'],
            market: addrs.arbitrum.COMET_USDC_ADDR,
        },
    ],
    optimism: [
        {
            baseAsset: 'USDC',
            collaterals: ['WETH', 'WBTC', 'OP'],
            market: addrs.optimism.COMET_USDC_ADDR,
        },
    ],
};

const compV3ApyAfterValuesTest = async () => {
    describe('Test Compound V3 apy after values', async () => {
        let senderAcc;
        let wallet;
        let snapshotId;
        let compV3ViewContract;

        before(async () => {
            [senderAcc] = await hre.ethers.getSigners();
            wallet = await getProxy(senderAcc.address);
            compV3ViewContract = await redeploy('CompV3View');
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });
        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        for (let i = 0; i < compV3Markets[network].length; ++i) {
            const marketData = compV3Markets[network][i];
            const baseAssetSymbol = marketData.baseAsset;
            const baseAsset = getAssetInfo(baseAssetSymbol, chainId);
            const marketAddr = marketData.market;

            for (let j = 0; j < marketData.collaterals.length; ++j) {
                const collAssetSymbol = marketData.collaterals[j];
                const collAsset = getAssetInfo(collAssetSymbol, chainId);

                it(`Should estimate APYs when creating position for pair [base_asset: ${baseAssetSymbol}, coll_asset: ${collAssetSymbol}]`, async () => {
                    const supplyAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(collAssetSymbol, '300000'),
                        collAsset.decimals,
                    );
                    const borrowAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(baseAssetSymbol, '100000'),
                        baseAsset.decimals,
                    );

                    const comet = await hre.ethers.getContractAt('IComet', marketAddr);

                    const oldUtilization = await comet.getUtilization();
                    const oldSupplyRate = await comet.getSupplyRate(oldUtilization);
                    const oldBorrowRate = await comet.getBorrowRate(oldUtilization);

                    const result = await compV3ViewContract.callStatic.getApyAfterValuesEstimation(
                        marketAddr,
                        senderAcc.address,
                        '0',
                        borrowAmount,
                    );
                    const estimatedUtilization = result.utilization;
                    const estimatedSupplyRate = result.supplyRate;
                    const estimatedBorrowRate = result.borrowRate;

                    await supplyCompV3(
                        marketAddr,
                        wallet,
                        collAsset.address,
                        supplyAmount,
                        senderAcc.address,
                        wallet.address,
                    );

                    await borrowCompV3(
                        marketAddr,
                        wallet,
                        borrowAmount,
                        wallet.address,
                        senderAcc.address,
                    );

                    const newUtilization = await comet.getUtilization();
                    const newSupplyRate = await comet.getSupplyRate(newUtilization);
                    const newBorrowRate = await comet.getBorrowRate(newUtilization);

                    console.log('Old utilization:', oldUtilization.toString());
                    console.log('Estimated utilization:', estimatedUtilization.toString());
                    console.log('New utilization:', newUtilization.toString());

                    console.log('Old supply rate:', oldSupplyRate.toString());
                    console.log('Estimated supply rate:', estimatedSupplyRate.toString());
                    console.log('New supply rate:', newSupplyRate.toString());

                    console.log('Old borrow rate:', oldBorrowRate.toString());
                    console.log('Estimated borrow rate:', estimatedBorrowRate.toString());
                    console.log('New borrow rate:', newBorrowRate.toString());

                    console.log('-------------');

                    // tolerate difference up to 0.01 % in utilization
                    expect(newUtilization).to.be.closeTo(estimatedUtilization, 1e14);
                });

                it(`Should estimate APYs when supplying base token: ${baseAssetSymbol}`, async () => {
                    const supplyAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(baseAssetSymbol, '500000'),
                        baseAsset.decimals,
                    );
                    const comet = await hre.ethers.getContractAt('IComet', marketAddr);

                    const oldUtilization = await comet.getUtilization();
                    const oldSupplyRate = await comet.getSupplyRate(oldUtilization);
                    const oldBorrowRate = await comet.getBorrowRate(oldUtilization);

                    const result = await compV3ViewContract.callStatic.getApyAfterValuesEstimation(
                        marketAddr,
                        senderAcc.address,
                        supplyAmount,
                        '0',
                    );
                    const estimatedUtilization = result.utilization;
                    const estimatedSupplyRate = result.supplyRate;
                    const estimatedBorrowRate = result.borrowRate;

                    await supplyCompV3(
                        marketAddr,
                        wallet,
                        baseAsset.address,
                        supplyAmount,
                        senderAcc.address,
                        wallet.address,
                    );

                    const newUtilization = await comet.getUtilization();
                    const newSupplyRate = await comet.getSupplyRate(newUtilization);
                    const newBorrowRate = await comet.getBorrowRate(newUtilization);

                    console.log('Old utilization:', oldUtilization.toString());
                    console.log('Estimated utilization:', estimatedUtilization.toString());
                    console.log('New utilization:', newUtilization.toString());

                    console.log('Old supply rate:', oldSupplyRate.toString());
                    console.log('Estimated supply rate:', estimatedSupplyRate.toString());
                    console.log('New supply rate:', newSupplyRate.toString());

                    console.log('Old borrow rate:', oldBorrowRate.toString());
                    console.log('Estimated borrow rate:', estimatedBorrowRate.toString());
                    console.log('New borrow rate:', newBorrowRate.toString());

                    console.log('-------------');

                    // tolerate difference up to 0.01 % in utilization
                    expect(newUtilization).to.be.closeTo(estimatedUtilization, 1e14);
                });

                it(`Should estimate APYs when supplying and borrowing base token: ${baseAssetSymbol}`, async () => {
                    const supplyAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(baseAssetSymbol, '500000'),
                        baseAsset.decimals,
                    );
                    const borrowAmount = hre.ethers.utils.parseUnits(
                        fetchAmountinUSDPrice(baseAssetSymbol, '200000'),
                        baseAsset.decimals,
                    );

                    const comet = await hre.ethers.getContractAt('IComet', marketAddr);

                    const oldUtilization = await comet.getUtilization();
                    const oldSupplyRate = await comet.getSupplyRate(oldUtilization);
                    const oldBorrowRate = await comet.getBorrowRate(oldUtilization);

                    const result = await compV3ViewContract.callStatic.getApyAfterValuesEstimation(
                        marketAddr,
                        senderAcc.address,
                        supplyAmount,
                        borrowAmount,
                    );
                    const estimatedUtilization = result.utilization;
                    const estimatedSupplyRate = result.supplyRate;
                    const estimatedBorrowRate = result.borrowRate;

                    await supplyCompV3(
                        marketAddr,
                        wallet,
                        baseAsset.address,
                        supplyAmount,
                        senderAcc.address,
                        wallet.address,
                    );
                    await borrowCompV3(
                        marketAddr,
                        wallet,
                        borrowAmount,
                        wallet.address,
                        senderAcc.address,
                    );

                    const newUtilization = await comet.getUtilization();
                    const newSupplyRate = await comet.getSupplyRate(newUtilization);
                    const newBorrowRate = await comet.getBorrowRate(newUtilization);

                    console.log('Old utilization:', oldUtilization.toString());
                    console.log('Estimated utilization:', estimatedUtilization.toString());
                    console.log('New utilization:', newUtilization.toString());

                    console.log('Old supply rate:', oldSupplyRate.toString());
                    console.log('Estimated supply rate:', estimatedSupplyRate.toString());
                    console.log('New supply rate:', newSupplyRate.toString());

                    console.log('Old borrow rate:', oldBorrowRate.toString());
                    console.log('Estimated borrow rate:', estimatedBorrowRate.toString());
                    console.log('New borrow rate:', newBorrowRate.toString());

                    console.log('-------------');

                    // tolerate difference up to 0.01 % in utilization
                    expect(newUtilization).to.be.closeTo(estimatedUtilization, 1e14);
                });
            }
        }
    });
};

describe('CompV3-apy-after-values', () => {
    it('... should test CompoundV3 APY after values', async () => {
        await compV3ApyAfterValuesTest();
    });
});

module.exports = {
    compV3ApyAfterValuesTest,
};
