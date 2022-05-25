/* eslint-disable no-await-in-loop */
const { getAssetInfo } = require('@defisaver/tokens');
const { expect } = require('chai');
const hre = require('hardhat');
const { balancerSupply, balancerWithdraw, balancerClaim } = require('../actions');
const {
    fetchAmountinUSDPrice,
    balanceOf,
    approve,
    setBalance,
    redeploy,
    getProxy,
    BAL_ADDR,
    impersonateAccount,
    stopImpersonatingAccount,
    revertToSnapshot,
    takeSnapshot,
    resetForkToBlock,
} = require('../utils');

const balancerSupplyTest = async () => {
    describe('Balancer-Supply', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy; let from; let to;

        const balancerPairs = [
            {
                name: 'WBTC - WETH',
                poolId: '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e',
                tokens: [getAssetInfo('WBTC').address, getAssetInfo('WETH').address],
                amountsIn: [
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WBTC', '10000'), getAssetInfo('WBTC').decimals),
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), getAssetInfo('WETH').decimals),
                ],
                poolAddress: '0xa6f548df93de924d73be7d25dc02554c6bd66db5',

            },
            {
                name: 'USDC - USDT',
                poolId: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063',
                tokens: [getAssetInfo('DAI').address, getAssetInfo('USDC').address, getAssetInfo('USDT').address],
                amountsIn: [
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('DAI', '10000'), getAssetInfo('DAI').decimals),
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('USDC', '10000'), getAssetInfo('USDC').decimals),
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('USDT', '10000'), getAssetInfo('USDT').decimals),
                ],
                poolAddress: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42',
            },
            {
                name: 'MKR - WETH',
                poolId: '0xaac98ee71d4f8a156b6abaa6844cdb7789d086ce00020000000000000000001b',
                tokens: [getAssetInfo('MKR').address, getAssetInfo('WETH').address],
                amountsIn: [
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('MKR', '12000'), getAssetInfo('MKR').decimals),
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '8000'), getAssetInfo('WETH').decimals),
                ],
                poolAddress: '0xaac98ee71d4f8a156b6abaa6844cdb7789d086ce',
            },
        ];

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            from = senderAcc.address;
            to = senderAcc.address;
        });
        for (let i = 0; i < balancerPairs.length; i++) {
            it(`... supply exact tokens for LP tokens -> ${balancerPairs[i].name}`, async () => {
                const snapshot = await takeSnapshot();
                const lpTokenBalanceBefore = await balanceOf(balancerPairs[i].poolAddress, to);
                const proxyBalanceAmounts = [];
                for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                    proxyBalanceAmounts.push(
                        await balanceOf(balancerPairs[i].tokens[j], proxy.address),
                    );
                    await setBalance(
                        balancerPairs[i].tokens[j],
                        senderAcc.address,
                        balancerPairs[i].amountsIn[j],
                    );
                    await approve(balancerPairs[i].tokens[j], proxy.address);
                }
                // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/balancer-js/src/pool-weighted/encoder.ts
                // joinExactTokensInForBPTOut - minimum of LP tokens set to 0
                const userData = hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [1, balancerPairs[i].amountsIn, 0]);
                await balancerSupply(
                    proxy,
                    balancerPairs[i].poolId,
                    from,
                    to,
                    balancerPairs[i].tokens,
                    balancerPairs[i].amountsIn,
                    userData,
                );
                const lpTokenBalanceAfter = await balanceOf(balancerPairs[i].poolAddress, to);
                const lpTokenDiff = lpTokenBalanceAfter.sub(lpTokenBalanceBefore);
                expect(lpTokenDiff).to.be.gt(0);
                for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                    expect(
                        await balanceOf(balancerPairs[i].tokens[j], proxy.address),
                    ).to.be.eq(proxyBalanceAmounts[j]);
                }
                await revertToSnapshot(snapshot);
            }).timeout(50000);

            it('... supply only first token for LP tokens', async () => {
                const snapshot = await takeSnapshot();
                const lpTokenBalanceBefore = await balanceOf(balancerPairs[i].poolAddress, to);
                const proxyBalanceAmounts = [];
                for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                    proxyBalanceAmounts.push(
                        await balanceOf(balancerPairs[i].tokens[j], proxy.address),
                    );
                    await setBalance(
                        balancerPairs[i].tokens[j],
                        senderAcc.address,
                        balancerPairs[i].amountsIn[j],
                    );
                    await approve(balancerPairs[i].tokens[j], proxy.address);
                }
                const lpAmountRequested = '191590522564772777';
                // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/balancer-js/src/pool-weighted/encoder.ts
                // joinTokenInForExactBPTOut - send only first token for exact LP tokens
                const userData = hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256', 'uint256'], [2, lpAmountRequested, 0]);
                await balancerSupply(
                    proxy,
                    balancerPairs[i].poolId,
                    from,
                    to,
                    balancerPairs[i].tokens,
                    balancerPairs[i].amountsIn,
                    userData,
                );
                const lpTokenBalanceAfter = await balanceOf(balancerPairs[i].poolAddress, to);
                const lpTokenDiff = lpTokenBalanceAfter.sub(lpTokenBalanceBefore);
                expect(lpTokenDiff).to.be.eq(lpAmountRequested);

                for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                    expect(
                        await balanceOf(balancerPairs[i].tokens[j], proxy.address),
                    ).to.be.eq(proxyBalanceAmounts[j]);
                }
                await revertToSnapshot(snapshot);
            }).timeout(50000);
        }
    });
};
const balancerWithdrawTest = async () => {
    describe('Balancer-Withdraw', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy; let from; let to;

        const balancerPairs = [
            {
                name: 'WBTC - WETH',
                poolId: '0xa6f548df93de924d73be7d25dc02554c6bd66db500020000000000000000000e',
                tokens: [getAssetInfo('WBTC').address, getAssetInfo('WETH').address],
                amountsIn: [
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WBTC', '10000'), getAssetInfo('WBTC').decimals),
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '10000'), getAssetInfo('WETH').decimals),
                ],
                poolAddress: '0xa6f548df93de924d73be7d25dc02554c6bd66db5',

            },
            {
                name: 'USDC - USDT',
                poolId: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42000000000000000000000063',
                tokens: [getAssetInfo('DAI').address, getAssetInfo('USDC').address, getAssetInfo('USDT').address],
                amountsIn: [
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('DAI', '10000'), getAssetInfo('DAI').decimals),
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('USDC', '10000'), getAssetInfo('USDC').decimals),
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('USDT', '10000'), getAssetInfo('USDT').decimals),
                ],
                poolAddress: '0x06df3b2bbb68adc8b0e302443692037ed9f91b42',
            },
            {
                name: 'MKR - WETH',
                poolId: '0xaac98ee71d4f8a156b6abaa6844cdb7789d086ce00020000000000000000001b',
                tokens: [getAssetInfo('MKR').address, getAssetInfo('WETH').address],
                amountsIn: [
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('MKR', '12000'), getAssetInfo('MKR').decimals),
                    hre.ethers.utils.parseUnits(fetchAmountinUSDPrice('WETH', '8000'), getAssetInfo('WETH').decimals),
                ],
                poolAddress: '0xaac98ee71d4f8a156b6abaa6844cdb7789d086ce',
            },
        ];

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            from = senderAcc.address;
            to = senderAcc.address;
        });
        for (let i = 0; i < balancerPairs.length; i++) {
            it(`... withdraw ${balancerPairs[i].name}`, async () => {
                const snapshot = await takeSnapshot();
                const lpTokenBalanceBefore = await balanceOf(balancerPairs[i].poolAddress, to);
                const proxyBalanceAmounts = [];
                for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                    proxyBalanceAmounts.push(
                        await balanceOf(balancerPairs[i].tokens[j], proxy.address),
                    );
                    await setBalance(
                        balancerPairs[i].tokens[j],
                        senderAcc.address,
                        balancerPairs[i].amountsIn[j],
                    );
                    await approve(balancerPairs[i].tokens[j], proxy.address);
                }
                // https://github.com/balancer-labs/balancer-v2-monorepo/blob/master/pkg/balancer-js/src/pool-weighted/encoder.ts
                // joinExactTokensInForBPTOut - minimum of LP tokens set to 0
                let userData = hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256[]', 'uint256'], [1, balancerPairs[i].amountsIn, 0]);
                await balancerSupply(
                    proxy,
                    balancerPairs[i].poolId,
                    from,
                    to,
                    balancerPairs[i].tokens,
                    balancerPairs[i].amountsIn,
                    userData,
                );
                const lpTokenBalanceAfter = await balanceOf(balancerPairs[i].poolAddress, to);
                const lpTokenDiff = lpTokenBalanceAfter.sub(lpTokenBalanceBefore);
                expect(lpTokenDiff).to.be.gt(0);
                for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                    expect(
                        await balanceOf(balancerPairs[i].tokens[j], proxy.address),
                    ).to.be.eq(proxyBalanceAmounts[j]);
                }
                // request at least 50% of previously supplied amount back
                const minAmountsOut = [];
                // to calculate difference in balances
                const eoaTokenBalancesBeforeWithdraw = [];
                for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                    minAmountsOut.push(balancerPairs[i].amountsIn[j].div(100).mul(50));
                    eoaTokenBalancesBeforeWithdraw.push(
                        await balanceOf(balancerPairs[i].tokens[j], to),
                    );
                }
                // exit a WeightedPool by removing tokens in return for an exact amount of BPT
                userData = hre.ethers.utils.defaultAbiCoder.encode(['uint256', 'uint256'], [1, lpTokenDiff]);
                await approve(balancerPairs[i].poolAddress, proxy.address);
                await balancerWithdraw(
                    proxy,
                    balancerPairs[i].poolId,
                    from,
                    to,
                    lpTokenDiff,
                    balancerPairs[i].tokens,
                    minAmountsOut,
                    userData,
                );
                const lpTokensAfterWithdraw = await balanceOf(balancerPairs[i].poolAddress, to);
                expect(lpTokensAfterWithdraw).to.be.eq(lpTokenBalanceBefore);
                for (let j = 0; j < balancerPairs[i].tokens.length; j++) {
                    expect(await balanceOf(balancerPairs[i].tokens[j], to))
                        .to.be.gt(eoaTokenBalancesBeforeWithdraw[j]);
                }
                await revertToSnapshot(snapshot);
            }).timeout(50000);
        }
    });
};
const balancerClaimTest = async () => {
    describe('Balancer Claiming', function () {
        this.timeout(80000);

        let senderAcc; let
            proxy;
        let snapshotId;
        // TODO: UPDATE merkle proofs and other data
        /// @dev this is tested on block number 14340400
        before(async () => {
            await resetForkToBlock(14783570);
            await redeploy('BalancerV2Claim');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });
        it('... claim Balancer tokens and leave them on liquidity provider wallet', async () => {
            const liqProvider = '0xd1d298e3be38708866d1bb9e45abd9f0b2dc3c24';
            const balBalanceBefore = await balanceOf(BAL_ADDR, liqProvider);
            const weeks = ['50', '51'];
            const balances = ['284303134863000000', '312264470527000000'];
            const merkleProofs = [[
                '0x6034adbb866aa673a706e916405ea85d07f77c5f73d1d3ab80e7cebe0ec0943d',
                '0x97e1b59d3c5cbc82e7ff09e27658749462c406032adf46364bf604c57fc89a44',
                '0xcdf782235dd23e12d5c5fa44475d7c65d6800b5565231b44ed867e69e45e38e3',
                '0x18d3fe91d41b13c664f3a63ebc8a7f696695125fb85f435157bbd8e8a1425858',
                '0xfbd0dd443e3253c8512533a49a457a25544e2d6035287eddde1d448254338774',
                '0xa978c3f1dafc6925e822e6faa1f8561ca74a385bea905979b001d9c041bc1a23',
                '0x71c9fad7024617629d7b95fe901effe07c5a856b06505ed1d615e9590d71287b',
                '0xd4b8810624b452a44d6af10b7f6a86f408ec8a3967706dd437f0276a827626f9',
                '0xd3d96e95e8b960b8ba3c261a547af72d42661ec69d464572a2c55160b740b633',
                '0x6454fb1af4090de0599f31eca6bf78f3927e28952e2c83e5a990ea1f7d90fa4e',
                '0xf115c88be20979f08a6956d7ebaa8e255cecb9437992373e54cd9b819267b811',
                '0xf67a93f3782cf8094938ce30e7b44936e01924409ed47ac4abde9144d96ed3ef',
                '0x0b221650234960cd30c87143bf84a7550d90e4c883426280d1015603a635c174',
            ], [
                '0x445b10d83e53967b0a559a0daa808a60b819aff2f56a740467a48a51cdd52f20',
                '0x48d8704242214fec674e2952adf5af7448df588f08d5410711d3346ee1359fd8',
                '0xb14c471cd726b7046bec43042f86cd7e0347d449668cb0618a8ecce89199a2eb',
                '0x1fbb9a69b822d84521598b5e7e4ce1d6494f5e13bacb49138dd2b79b2302acdd',
                '0xeb61a02a5ccb3f5179815fadf9d87c147edf4ae647f9e088a91f9a3dbd9f6c1b',
                '0x48534c3cb9294c82cffcdd2d765f0b891f7971e247ce673e12f095615962f700',
                '0xd56e988bbff7f7cd489a9ed6b327189a826127cef7f01d488997a6056894333b',
                '0x520cbf5259e8b031d222e09482c0f9e9a129cb76da35091fe74a630e4b0d87ac',
                '0x0434e149c89ccc20560d29225974cd6ec6570089b3e6d5bcfdf19d296a277c2d',
                '0x3a3f9b9626bfc5a09fa78e03feff811d98050f87ab324cc4a03161ded6596e25',
                '0x4976d22a6bdb93b9e8e56b769db64b285ca9ed1c6b8b92965db547500096ffac',
                '0x0b474269dfad659bf8354fae66ef33fd729b17bd9ea3ca08bdc430ef1713f43a',
            ]];
            const balanceChangeAmount = '596567605390000000';
            await balancerClaim(proxy, liqProvider, liqProvider, weeks, balances, merkleProofs);
            const balBalanceAfter = await balanceOf(BAL_ADDR, liqProvider);
            expect(balBalanceBefore).to.be.eq(balBalanceAfter.sub(balanceChangeAmount));
        }).timeout(50000);

        it('... claim Balancer tokens and pull them to proxy', async () => {
            const balBalanceBefore = await balanceOf(BAL_ADDR, proxy.address);
            const liqProvider = '0xd1d298e3be38708866d1bb9e45abd9f0b2dc3c24';
            const weeks = ['50', '51'];
            const balances = ['284303134863000000', '312264470527000000'];
            const merkleProofs = [[
                '0x6034adbb866aa673a706e916405ea85d07f77c5f73d1d3ab80e7cebe0ec0943d',
                '0x97e1b59d3c5cbc82e7ff09e27658749462c406032adf46364bf604c57fc89a44',
                '0xcdf782235dd23e12d5c5fa44475d7c65d6800b5565231b44ed867e69e45e38e3',
                '0x18d3fe91d41b13c664f3a63ebc8a7f696695125fb85f435157bbd8e8a1425858',
                '0xfbd0dd443e3253c8512533a49a457a25544e2d6035287eddde1d448254338774',
                '0xa978c3f1dafc6925e822e6faa1f8561ca74a385bea905979b001d9c041bc1a23',
                '0x71c9fad7024617629d7b95fe901effe07c5a856b06505ed1d615e9590d71287b',
                '0xd4b8810624b452a44d6af10b7f6a86f408ec8a3967706dd437f0276a827626f9',
                '0xd3d96e95e8b960b8ba3c261a547af72d42661ec69d464572a2c55160b740b633',
                '0x6454fb1af4090de0599f31eca6bf78f3927e28952e2c83e5a990ea1f7d90fa4e',
                '0xf115c88be20979f08a6956d7ebaa8e255cecb9437992373e54cd9b819267b811',
                '0xf67a93f3782cf8094938ce30e7b44936e01924409ed47ac4abde9144d96ed3ef',
                '0x0b221650234960cd30c87143bf84a7550d90e4c883426280d1015603a635c174',
            ], [
                '0x445b10d83e53967b0a559a0daa808a60b819aff2f56a740467a48a51cdd52f20',
                '0x48d8704242214fec674e2952adf5af7448df588f08d5410711d3346ee1359fd8',
                '0xb14c471cd726b7046bec43042f86cd7e0347d449668cb0618a8ecce89199a2eb',
                '0x1fbb9a69b822d84521598b5e7e4ce1d6494f5e13bacb49138dd2b79b2302acdd',
                '0xeb61a02a5ccb3f5179815fadf9d87c147edf4ae647f9e088a91f9a3dbd9f6c1b',
                '0x48534c3cb9294c82cffcdd2d765f0b891f7971e247ce673e12f095615962f700',
                '0xd56e988bbff7f7cd489a9ed6b327189a826127cef7f01d488997a6056894333b',
                '0x520cbf5259e8b031d222e09482c0f9e9a129cb76da35091fe74a630e4b0d87ac',
                '0x0434e149c89ccc20560d29225974cd6ec6570089b3e6d5bcfdf19d296a277c2d',
                '0x3a3f9b9626bfc5a09fa78e03feff811d98050f87ab324cc4a03161ded6596e25',
                '0x4976d22a6bdb93b9e8e56b769db64b285ca9ed1c6b8b92965db547500096ffac',
                '0x0b474269dfad659bf8354fae66ef33fd729b17bd9ea3ca08bdc430ef1713f43a',
            ]];

            const balanceChangeAmount = '596567605390000000';

            await impersonateAccount(liqProvider);
            const tokenContract = await hre.ethers.getContractAt('IERC20', BAL_ADDR);
            const liquidityProviderAccount = await hre.ethers.provider.getSigner(liqProvider);

            const connectedTokenContract = tokenContract.connect(liquidityProviderAccount);
            await connectedTokenContract.approve(proxy.address, hre.ethers.constants.MaxUint256);
            await stopImpersonatingAccount(liqProvider);

            await balancerClaim(proxy, liqProvider, proxy.address, weeks, balances, merkleProofs);
            const balBalanceAfter = await balanceOf(BAL_ADDR, proxy.address);
            expect(balBalanceBefore).to.be.eq(balBalanceAfter.sub(balanceChangeAmount));
        }).timeout(50000);
        after(async () => {
            await resetForkToBlock();
        });
    });
};

const balancerDeployContracts = async () => {
    await redeploy('BalancerV2Supply');
    await redeploy('BalancerV2Withdraw');
};
const balancerFullTest = async () => {
    await balancerDeployContracts();
    await balancerSupplyTest();
    await balancerWithdrawTest();
    await balancerClaimTest();
};

module.exports = {
    balancerFullTest,
    balancerSupplyTest,
    balancerWithdrawTest,
    balancerClaimTest,
};
