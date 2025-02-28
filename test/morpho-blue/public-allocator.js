/* eslint-disable import/prefer-default-export */
/* eslint-disable max-len */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-unused-vars */
/* eslint-disable no-mixed-operators */
/* eslint-disable no-undef */

/// @dev Data fetching adapted from 'https://github.com/morpho-org/public-allocator-scripts'

const hre = require('hardhat');
const { expect } = require('chai');
const dfs = require('@defisaver/sdk');
const {
    getProxy,
    redeploy,
    chainIds,
    network,
    isNetworkFork,
    addrs,
    getOwnerAddr,
    setBalance,
    approve,
    revertToSnapshot,
    takeSnapshot,
} = require('../utils');
const { executeAction } = require('../actions');
const { topUp } = require('../../scripts/utils/fork');

// wstETH/ETH 0.965 market on mainnet
const MARKET_ID_MAINNET = '0xb8fc70e82bc5bb53e773626fcc6a23f7eefa036918d7ef216ecfb1950a94a85e';
const MARKET_PARAMS_MAINNET = [
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    '0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0',
    '0xbD60A6770b27E084E8617335ddE769241B0e71D8',
    '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
    '965000000000000000',
];
// cbBTC/usdc 0.86 market on base
const MARKET_ID_BASE = '0x9103c3b4e834476c9a62ea009ba2c884ee42e94e6e314a26f04d312434191836';
const MARKET_PARAMS_BASE = [
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
    '0x663BECd10daE6C4A3Dcd89F1d76c1174199639B9',
    '0x46415998764C29aB2a25CbeA6254146D50D22687',
    '860000000000000000',
];
const MARKET_ID = chainIds[network] === 1 ? MARKET_ID_MAINNET : MARKET_ID_BASE;
const MARKET_PARAMS = chainIds[network] === 1 ? MARKET_PARAMS_MAINNET : MARKET_PARAMS_BASE;

const API_URL = 'https://blue-api.morpho.org/graphql';
const QUERY = `
    query MarketByUniqueKey($uniqueKey: String!, $chainId: Int!) {
        marketByUniqueKey(uniqueKey: $uniqueKey, chainId: $chainId) {
        reallocatableLiquidityAssets
        loanAsset {
            address
            decimals
            priceUsd
        }
        state {
            liquidityAssets
        }
        publicAllocatorSharedLiquidity {
            assets
            vault {
            address
            name
            }
            allocationMarket {
            uniqueKey
            loanAsset {
                address
            }
            collateralAsset {
                address
            }
            irmAddress
            oracle {
                address
            }
            lltv
            }
        }
        loanAsset {
            address
        }
        collateralAsset {
            address
        }
        oracle {
            address
        }
        irmAddress
        lltv  
        }
    }
`;

const abiCoder = new hre.ethers.utils.AbiCoder();
const getMarketId = (market) => {
    const encodedMarket = abiCoder.encode(
        ['address', 'address', 'address', 'address', 'uint256'],
        [
            market[0],
            market[1],
            market[2],
            market[3],
            market[4],
        ],
    );
    return hre.ethers.utils.keccak256(encodedMarket);
};

const fetchMarketData = async () => {
    const body = JSON.stringify({
        query: QUERY,
        variables: { uniqueKey: MARKET_ID, chainId: chainIds[network] },
    });
    let res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
    });
    res = await res.json();
    const marketData = res?.data?.marketByUniqueKey;

    return marketData;
};

const getAllocations = async (marketData, liquidity) => {
    const maxToAllocate = BigInt(marketData.reallocatableLiquidityAssets);
    const liquidityToAllocate = liquidity > maxToAllocate ? (maxToAllocate / 2n) : liquidity;

    // First, group and sum assets by vault
    const vaultTotalAssets = marketData.publicAllocatorSharedLiquidity.reduce(
        (acc, item) => {
            const vaultAddress = item.vault.address;
            acc[vaultAddress] = (acc[vaultAddress] || 0n) + BigInt(item.assets);
            return acc;
        },
        {},
    );
    // Sort vaults by total assets (descending)
    const sortedVaults = Object.entries(vaultTotalAssets).sort(
        ([, a], [, b]) => Number(b) - Number(a),
    );

    let totalReallocated = 0n;
    const withdrawalsPerVault = {};

    // Process each vault's allocations
    for (const [vaultAddress] of sortedVaults) {
        if (totalReallocated >= liquidityToAllocate) break;

        const vaultAllocations = marketData.publicAllocatorSharedLiquidity.filter(
            (item) => item.vault.address === vaultAddress,
        );
        for (const item of vaultAllocations) {
            if (totalReallocated >= liquidityToAllocate) break;
            const itemAmount = BigInt(item.assets);
            const leftToAllocate = liquidityToAllocate - totalReallocated;
            const amountToTake = itemAmount < leftToAllocate ? itemAmount : leftToAllocate;
            totalReallocated += amountToTake;
            const withdrawal = [
                [
                    item.allocationMarket.loanAsset.address,
                    item.allocationMarket.collateralAsset?.address || hre.ethers.constants.AddressZero,
                    item.allocationMarket.oracle?.address || hre.ethers.constants.AddressZero,
                    item.allocationMarket.irmAddress,
                    BigInt(item.allocationMarket.lltv),
                ],
                amountToTake,
            ];
            if (!withdrawalsPerVault[vaultAddress]) {
                withdrawalsPerVault[vaultAddress] = [];
            }
            withdrawalsPerVault[vaultAddress].push(withdrawal);
        }
    }

    const vaults = Object.keys(withdrawalsPerVault);
    const withdrawals = vaults.map(
        (vaultAddress) => withdrawalsPerVault[vaultAddress].sort(
            (a, b) => getMarketId(a[0]).localeCompare(getMarketId(b[0])),
        ),
    );

    return {
        vaults,
        withdrawals,
        totalReallocated,
    };
};

const morphoBlueReallocateLiquidityTest = async (isFork) => {
    describe('MorphoBlue Reallocate Liquidity test', function () {
        this.timeout(1200000);
        let senderAcc;
        let proxy;
        let allocateContract;
        let view;

        before(async () => {
            console.log('Running on fork:', isFork);
            if (network !== 'mainnet') {
                dfs.configure({
                    chainId: 8453,
                    testMode: true,
                });
            }
            [senderAcc] = await hre.ethers.getSigners();
            if (isFork) {
                await topUp(senderAcc.address);
                await topUp(getOwnerAddr());
            }
            proxy = await getProxy(senderAcc.address, hre.config.isWalletSafe);
            allocateContract = await redeploy('MorphoBlueReallocateLiquidity', isFork);
            console.log('Deployed MorphoBlueReallocateLiquidity to address:', allocateContract.address);
            view = await redeploy('MorphoBlueView', isFork);
        });
        beforeEach(async () => { snapshotId = await takeSnapshot(); });
        afterEach(async () => { await revertToSnapshot(snapshotId); });

        it('... test MorphoBlue reallocate direct', async () => {
            const marketData = await fetchMarketData();
            // 6200 ETH to trigger two vaults allocations at the moment of writing this test
            const liquidity = BigInt('6100000000000000000000');
            const { vaults, withdrawals } = await getAllocations(marketData, liquidity);
            const action = new dfs.actions.morphoblue.MorphoBlueReallocateLiquidityAction(
                MARKET_PARAMS[0],
                MARKET_PARAMS[1],
                MARKET_PARAMS[2],
                MARKET_PARAMS[3],
                MARKET_PARAMS[4],
                vaults,
                withdrawals,
            );
            const functionData = action.encodeForDsProxyCall()[1];
            const tx = await executeAction('MorphoBlueReallocateLiquidity', functionData, proxy);
        });
        it('... test MorphoBlue reallocate with borrow inside recipe', async () => {
            const marketData = await fetchMarketData();
            const currentlyAvailableLiquidity = BigInt(marketData.state.liquidityAssets);
            const maxToAllocate = BigInt(marketData.reallocatableLiquidityAssets);

            const additionalLiquidityNeeded = maxToAllocate / 2n;
            const amountToBorrow = currentlyAvailableLiquidity + additionalLiquidityNeeded;
            const {
                vaults, withdrawals, totalReallocated,
            } = await getAllocations(marketData, additionalLiquidityNeeded);

            const collToken = MARKET_PARAMS[1];
            const supplyAmount = amountToBorrow * 10n;
            await setBalance(collToken, senderAcc.address, hre.ethers.BigNumber.from(supplyAmount.toString()));
            await approve(collToken, proxy.address, senderAcc);

            let marketInfo = await view.callStatic.getMarketInfo(MARKET_PARAMS);
            const borrowRateBeforeOpen = marketInfo.borrowRate;

            const estimatedBorrowRateWithMarket = await view.callStatic.getApyAfterValuesEstimation(
                MARKET_PARAMS,
                [
                    [false, totalReallocated, '0'],
                    [true, '0', amountToBorrow],
                ],
            );
            const estimatedBorrowRate = estimatedBorrowRateWithMarket.borrowRate;

            const recipe = new dfs.Recipe('OpenMorphoBluePositionWithPublicAllocation', [
                new dfs.actions.morphoblue.MorphoBlueSupplyCollateralAction(
                    MARKET_PARAMS[0],
                    MARKET_PARAMS[1],
                    MARKET_PARAMS[2],
                    MARKET_PARAMS[3],
                    MARKET_PARAMS[4],
                    supplyAmount,
                    senderAcc.address,
                    proxy.address,
                ),
                new dfs.actions.morphoblue.MorphoBlueReallocateLiquidityAction(
                    MARKET_PARAMS[0],
                    MARKET_PARAMS[1],
                    MARKET_PARAMS[2],
                    MARKET_PARAMS[3],
                    MARKET_PARAMS[4],
                    vaults,
                    withdrawals,
                ),
                new dfs.actions.morphoblue.MorphoBlueBorrowAction(
                    MARKET_PARAMS[0],
                    MARKET_PARAMS[1],
                    MARKET_PARAMS[2],
                    MARKET_PARAMS[3],
                    MARKET_PARAMS[4],
                    amountToBorrow,
                    proxy.address,
                    senderAcc.address,
                ),
            ]);
            const functionData = recipe.encodeForDsProxyCall()[1];
            await executeAction('RecipeExecutor', functionData, proxy);

            // check apy after values estimation
            marketInfo = await view.callStatic.getMarketInfo(MARKET_PARAMS);
            const borrowRateAfterOpen = marketInfo.borrowRate;

            console.log('Rate before open:', borrowRateBeforeOpen.toString());
            console.log('Rate after open:', borrowRateAfterOpen.toString());
            console.log('Estimated rate:', estimatedBorrowRate.toString());

            expect(estimatedBorrowRate).to.be.closeTo(borrowRateAfterOpen, 1e6);
        });
    });
};

describe('MorphoBlueReallocateLiquidity', function () {
    this.timeout(80000);
    it('... test morpho blue liquidity reallocation', async () => {
        await morphoBlueReallocateLiquidityTest(isNetworkFork());
    }).timeout(50000);
});

module.exports = {
    morphoBlueReallocateLiquidityTest,
};
