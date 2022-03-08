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
        // TODO: UPDATE merkle proofs and other data
        /// @dev this is tested on block number 14340400
        before(async () => {
            await resetForkToBlock(14340400);
            await redeploy('BalancerV2Claim');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
        it('... claim Balancer tokens and leave them on liquidity provider wallet', async () => {
            const liqProvider = '0x7eb510a2d3316dd2cdca937a95ec81cdf140a98d';
            const balBalanceBefore = await balanceOf(BAL_ADDR, liqProvider);
            const weeks = ['40', '41'];
            const balances = ['7206527418624000000', '4956940391238000000'];
            const merkleProofs = [[
                '0xa1686f1a9dd80ffd016fe4aa5c6b2f256d4af0fb14f1bd064606d7a8e9bd97d6',
                '0xa3739bc09c73d8d9b977cbe2f4e8a686086ce43fab641358b2d371ecfa850a36',
                '0x744edca176c1345418ee7b5ab14fc2c8b89e751662864995f3a6454d98a4a12f',
                '0x22b38144f4bbef7d055dc5ff145f4c8f3837a41aa1c64c0793ba769d16d0d0a5',
                '0x48060bab54ce5e9a1eaeeba0df025b28bc4de4f4a6039147be16bcbf500f6c08',
                '0x7f0ed0663ef5be3f1d204832fe961578d243e8176f9e15271c558f3fbc898791',
                '0x2a01cb4d0689ad424571af14871bdf20fedc0ba5bfa2e50abe8bd330a4f44e41',
                '0xa2f3af06d6cf1a2a222afd7ea88ad0d6da210e9873d64a9f3f94afbd25eebc4f',
                '0xf1d72f1757982c6d58a197f970e4f6bae51833125c0dd1900a2c78af68db89d0',
                '0xd8fc9a69bad0d5e239be5f26d51ab33227dd793294cbcb80a90d34299076c52b',
                '0x308214941e3379b390f8e9766c1abfef885d1a1cd7541dc7e3c2772a5a98b328',
                '0x950b1e6196ba2b5587ed2509ee854230438a895fd332a1ceac8c116f7344fad2',
            ], [
                '0x1206e502394066162f473b6564e23933cd60984bc6dcb4d5c57f399a508ccffb',
                '0x0545d89ae208f0f4254debf26528bdd48ba210c14beff4272a06bf30e8650e73',
                '0x65df5743c79831186f6408894d414864daeabb763cb850a4b056adfd4b8973fe',
                '0xaba7cd047c1e2382a2c867bd10a190ab06d8ed9d88e14dc44f2dac93b61230e2',
                '0x20b752cf4a881642078d1dc55177ea43f80eb2852bbf75d11bb5d077b7dcd68b',
                '0x7997e5e1c2901a0bc344bbee9fae1b74d6326b10ac8687ac1854821a283be8c5',
                '0xacfcfafd23e286a2a75a6ecea65a29b2f099d0bf06c730c3c5f93a5936b160a0',
                '0x8bb6ed30028213403c71ecaa946e1bafb0f6036383904f1e772a7f7856f9b12b',
                '0x404a8fb6a5797aede2647ff9b26be857f088575f363f27308ee94f01f871851b',
                '0x4fa44ce94b1bff7d4dc98657b97a3169c2c936fd6d6816dcfe6bf5d4fdc28247',
                '0xd9bdc288545f8f7b4d201fb70b58817a91292c7d69a3c848fd19aad7278cd2f0',
                '0xfc2a36ece494c459bc02e38c3590876eb35219d0521087fd99c70de08c286117',
            ]];
            const balanceChangeAmount = '12163467809862000000';
            await balancerClaim(proxy, liqProvider, liqProvider, weeks, balances, merkleProofs);
            const balBalanceAfter = await balanceOf(BAL_ADDR, liqProvider);
            expect(balBalanceBefore).to.be.eq(balBalanceAfter.sub(balanceChangeAmount));
        }).timeout(50000);

        it('... claim Balancer tokens and pull them to proxy', async () => {
            const balBalanceBefore = await balanceOf(BAL_ADDR, proxy.address);
            const liqProvider = '0xbb44be3a16dada1c1b3217f3f3d17000aa4d8a0e';
            const weeks = ['38', '39', '40', '41'];
            const balances = ['58497362051000000', '299641995864000000', '328600678547000000', '314590040799000000'];
            const merkleProofs = [[
                '0x8f648ef9580c4f6828e5e50a48f0523bd53c4a7a9bd2524d41aeecfbb1461c82',
                '0x9b1296ce658f1be4c31b1a2c7ec3f42c5b3c97167c700af8d709182b4ae51d31',
                '0xb4e28147056406a92463c8e21d07d82f344bbbaac60c7657960144f2041460f5',
                '0xfbefa2bf956714eb56ba25a386e7b12e37c7db640db7b7b56397b10e64653017',
                '0x3ca77262e17a400b3dc99e88b57c24de14ae7cd5bcb8ac055ee3769ca024f2a0',
                '0x4646fd408bac0cefe92a58ba16350e06ee11be60b9a553a66419d0e58e4b0b3a',
                '0xa9828855aef428ede7146cbe6b3b706cff643ee99dd2ceeb91c4756d76c1f1bb',
                '0xfa690d6daa1573391a512024c627f33d26ec1b3806a7e08c6a0f0ae55657b811',
                '0x22103d46dea5ec941f430ec6c6aad7bd1b39f44ae02be3314065078de93f71d1',
                '0x4d00f4df3aa9543e0910a5ec553621e00bdbc15edd2d825481c9d4ef35359505',
                '0x45b14f4e377acf3ae5867e713d303d01542143709c6989f4484f8039e1333b25',
                '0x44124bffe4ac9858debb179809a20b05f37f5e8f8e467d3e4defe757fa65d98d',
            ], [
                '0xb17f1f9cd5cd8e4a89ba11684c8168fa0735446ebd5e5380c4b5edbecbafd1ce',
                '0x90d662f315ada55b36e7dcb970cf1b182fc845cd829e8cfc97869b15dc1eb7af',
                '0xf9886aeb604b9bae412434336987f561ffcd53adaeb29deafaf10368b7bba2b2',
                '0x886b181808526471d4af02572f4a3bb2b0ac0dc6305ebd4c1d75badd33771383',
                '0xb67287825a54821c1f01a7f69ad0154046bfa59de8f6fb77a85f94acbe944d7a',
                '0xa41adec0a1a6dca8fe102b50c9f309e68d4dbf3a250ca948860245ee80f2611e',
                '0x34427c9279a09a01654a8e9cd72d44e5679e711bcb5c93c381599647e45cc615',
                '0xb15ef78a7b91ebdd9eda0b8ecb6e7faad44786d185175303819637d290487ae3',
                '0x132008d3fce73f4080b1c490a70f95603c4169eadd1accef69bb423c6a248a7d',
                '0xaa57a28043174290508f350312c1c4f60eac844ff9a1f3570d703efb3b11ca65',
                '0xa183e649a59961a46d104f0790837ae486c9c2fc1aefe8ea85035a6bb5522814',
                '0x06daf82f88f87ad065933099ab9c956104db9532d3e483bec8f83a273357f1fc',
            ], [
                '0xa42d79d925918a411b3b0616aab5673649d0b99367e9fa53d5ceea63f50ba38b',
                '0x57180d5c1a36fad39bd8be615f440d145787aa4359bab1b5f116d52dfdb79777',
                '0xcf4f630b77212f5bcf9b2f03ed52617ced83afe455e2663b121bf1700824d10b',
                '0x67cad9f0c31a5c3de9bf3812c655fafc5b71bfc00a18453bad90c0391054b107',
                '0x710f26db3a7c199835d35f1a07beb2e54573c1168fdb1be327d754d51228f69d',
                '0xc32da2169d9e5b0d8b76afb788bd53068144ce6747baa6048656fe343165a79c',
                '0x45e9ff96a5893aeb660f6eab9c40f55f4bdc7f7b35ead08234255d49bda8c026',
                '0xa2f3af06d6cf1a2a222afd7ea88ad0d6da210e9873d64a9f3f94afbd25eebc4f',
                '0xf1d72f1757982c6d58a197f970e4f6bae51833125c0dd1900a2c78af68db89d0',
                '0xd8fc9a69bad0d5e239be5f26d51ab33227dd793294cbcb80a90d34299076c52b',
                '0x308214941e3379b390f8e9766c1abfef885d1a1cd7541dc7e3c2772a5a98b328',
                '0x950b1e6196ba2b5587ed2509ee854230438a895fd332a1ceac8c116f7344fad2',
            ], [
                '0xc70f74ae76f3f323dc62b20c4a064079c855ead2ddda98d7f46a53c5e0e0e639',
                '0x135362e4c20ba7c9755d61c8e094733d10f7f009970a4e014843c8529a0a9891',
                '0x348c71a70a48b94b84c7b4d460b7bd6438be97dfeaa76af32b886e7dc420c24f',
                '0xd13f795133ef6fb7a3ded853872283ab69faf507a68a4305ee156050051113ca',
                '0xa873098bc6b1876e74a31ed08d1638c8eec15882ec26a650004ebf849438b317',
                '0x3db3574545ed6fa8732ce45b802a4c437a5f719db9dc49375b6edd933b1c9cee',
                '0xea8407ac04df3f076fa7d67aaa98414a06074eb1f39854c85c9926fb73fe7241',
                '0xee5074c4b5a46c8d030a3126a60e5d6da80d65ff19862dad54cfcd95bafe14e9',
                '0x91a1621db24f6fe6886090c7dee4b87b5d92d596c72477447a36277d5755cbc7',
                '0xd2db4a4c3bb37be58791b5a2c49e7d6ea8c49c6c2f781de5b77c789e19a56dd8',
                '0x2e76924e4ec2febe3f9ab1673f88554c086bdf0cfe479fae0f38252daa960a09',
            ]];

            const balanceChangeAmount = '1001330077261000000';

            await impersonateAccount('0xbb44be3a16dada1c1b3217f3f3d17000aa4d8a0e');
            const tokenContract = await hre.ethers.getContractAt('IERC20', BAL_ADDR);
            const liquidityProviderAccount = await hre.ethers.provider.getSigner('0xbb44be3a16dada1c1b3217f3f3d17000aa4d8a0e');

            const connectedTokenContract = tokenContract.connect(liquidityProviderAccount);
            await connectedTokenContract.approve(proxy.address, hre.ethers.constants.MaxUint256);
            await stopImpersonatingAccount('0xbb44be3a16dada1c1b3217f3f3d17000aa4d8a0e');

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
