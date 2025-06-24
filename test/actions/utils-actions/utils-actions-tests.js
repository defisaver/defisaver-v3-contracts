const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');
const { getAssetInfo } = require('@defisaver/tokens');

const ISubscriptionsABI = require('../../../artifacts/contracts/interfaces/ISubscriptions.sol/ISubscriptions.json').abi;
const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    balanceOf,
    formatExchangeObj,
    setNewExchangeWrapper,
    sendEther,
    depositToWeth,
    send,
    approve,
    stopImpersonatingAccount,
    impersonateAccount,
    setBalance,
    resetForkToBlock,
    redeployCore,
    fetchAmountinUSDPrice,
    openStrategyAndBundleStorage,
    getChainLinkPrice,
    getNftOwner,
    WETH_ADDRESS,
    ETH_ADDR,
    DAI_ADDR,
    LUSD_ADDR,
    BOND_NFT_ADDR,
    takeSnapshot,
    revertToSnapshot,
    WBTC_ADDR,
    addrs,
    chainIds,
    network,
} = require('../../utils/utils');

const { fetchMakerAddresses } = require('../../utils/mcd');
const {
    changeProxyOwner,
    automationV2Unsub,
    executeAction,
    openVault,
    updateSubData,
    createChickenBond,
    transferNFT,
    kingClaim,
} = require('../../utils/actions');
const { addBotCaller, createStrategy, subToStrategy } = require('../../strategies/utils/utils-strategies');
const { createMcdCloseStrategy } = require('../../../strategies-spec/mainnet');
const { subMcdCloseStrategy } = require('../../strategies/utils/strategy-subs');
const { RATIO_STATE_OVER, createChainLinkPriceTrigger } = require('../../strategies/utils/triggers');

const permitTokenTest = async () => {
    /// @dev for running this test you need to add chainId : 1 to local and hardhat networks in cfg
    describe('Permit-Token', function () {
        this.timeout(80000);

        let senderAcc; let proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
        it('... should permit tokens for DSProxy to pull from eoa', async () => {
            const snapshot = await takeSnapshot();
            const chainId = chainIds[network];
            const wsteth = getAssetInfo('wsteth', chainId);
            const wstethAddress = wsteth.address;

            const wstethPermitContract = await hre.ethers.getContractAt('IERC20Permit', wstethAddress);
            const nonce = await wstethPermitContract.nonces(senderAcc.address);
            const wstethContract = await hre.ethers.getContractAt('IERC20', wstethAddress);
            const name = await wstethContract.name();
            const version = '1';

            const value = hre.ethers.utils.parseUnits('10000', 18);
            const deadline = '2015495230';

            const signature = hre.ethers.utils.splitSignature(
                // eslint-disable-next-line no-underscore-dangle
                await senderAcc._signTypedData(
                    {
                        name,
                        version,
                        chainId,
                        verifyingContract: wstethAddress,
                    },
                    {
                        Permit: [
                            {
                                name: 'owner',
                                type: 'address',
                            },
                            {
                                name: 'spender',
                                type: 'address',
                            },
                            {
                                name: 'value',
                                type: 'uint256',
                            },
                            {
                                name: 'nonce',
                                type: 'uint256',
                            },
                            {
                                name: 'deadline',
                                type: 'uint256',
                            },
                        ],
                    },
                    {
                        owner: senderAcc.address,
                        spender: proxy.address,
                        value,
                        nonce,
                        deadline,
                    },
                ),
            );

            const permitAction = new dfs.actions.basic.PermitTokenAction(
                wstethAddress,
                senderAcc.address,
                proxy.address,
                value, deadline, signature.v, signature.r, signature.s,
            );
            const functionData = permitAction.encodeForDsProxyCall()[1];

            const allowanceBefore = await wstethContract.allowance(
                senderAcc.address, proxy.address,
            );
            await executeAction('PermitToken', functionData, proxy);
            const allowanceAfter = await wstethContract.allowance(senderAcc.address, proxy.address);

            expect(allowanceAfter.sub(allowanceBefore)).to.eq(value);
            await revertToSnapshot(snapshot);
        });
    });
};

const wrapEthTest = async () => {
    describe('Wrap-Eth', function () {
        this.timeout(80000);

        let makerAddresses; let senderAcc; let proxy; let
            uniWrapperAddr;
        let recipeExecutorAddr;

        before(async () => {
            uniWrapperAddr = await getAddrFromRegistry('UniswapWrapperV3');

            makerAddresses = await fetchMakerAddresses();
            recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');

            // eslint-disable-next-line prefer-destructuring
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await setNewExchangeWrapper(senderAcc, uniWrapperAddr);
        });
        it('... should wrap native Eth to Weth direct action', async () => {
            const amount = hre.ethers.utils.parseUnits('2', 18);
            const wrapEthAddr = await getAddrFromRegistry('WrapEth');
            const wrapEthAction = new dfs.actions.basic.WrapEthAction(amount);
            const functionData = wrapEthAction.encodeForDsProxyCall()[1];

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, proxy.address);
            console.log(`Weth proxy before: ${wethBalanceBefore / 1e18}`);

            await proxy['execute(address,bytes)'](wrapEthAddr, functionData, {
                value: amount,
                gasLimit: 3000000,
            });
            const wethBalanceAfter = await balanceOf(WETH_ADDRESS, proxy.address);
            console.log(`Weth proxy after: ${wethBalanceAfter / 1e18}`);

            expect(wethBalanceAfter / 1e18).to.be.eq(wethBalanceBefore / 1e18 + amount / 1e18);
        });

        it('... should do a market sell but first wrap eth -> weth', async () => {
            const amount = hre.ethers.utils.parseUnits('2', 18);

            const exchangeOrder = formatExchangeObj(
                WETH_ADDRESS,
                makerAddresses.MCD_DAI,
                amount,
                uniWrapperAddr,
            );

            const wrapRecipe = new dfs.Recipe('WrapRecipe', [
                new dfs.actions.basic.WrapEthAction(amount),
                new dfs.actions.basic.SellAction(exchangeOrder, proxy.address, senderAcc.address),
            ]);

            const functionData = wrapRecipe.encodeForDsProxyCall();

            const daiBalanceBefore = await balanceOf(makerAddresses.MCD_DAI, senderAcc.address);
            console.log(`Dai acc before: ${daiBalanceBefore / 1e18}`);
            await proxy['execute(address,bytes)'](recipeExecutorAddr, functionData[1], {
                gasLimit: 3000000,
                value: amount,
            });

            const daiBalanceAfter = await balanceOf(makerAddresses.MCD_DAI, senderAcc.address);
            console.log(`Dai acc after: ${daiBalanceAfter / 1e18}`);

            expect(daiBalanceAfter).to.be.gt(daiBalanceBefore);
        });
    });
};
const unwrapEthTest = async () => {
    describe('Unwrap-Eth', function () {
        this.timeout(80000);

        let senderAcc; let proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
        it('... should unwrap native WEth to Eth direct action', async () => {
            const amount = hre.ethers.utils.parseUnits('2', 18);
            await depositToWeth(amount);

            await send(WETH_ADDRESS, proxy.address, amount);

            const unwrapEthAction = new dfs.actions.basic.UnwrapEthAction(
                amount, senderAcc.address,
            );
            const functionData = unwrapEthAction.encodeForDsProxyCall()[1];

            const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth proxy before: ${ethBalanceBefore / 1e18}`);

            await executeAction('UnwrapEth', functionData, proxy);

            const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth proxy after: ${ethBalanceAfter / 1e18}`);

            expect(ethBalanceAfter / 1e18).to.be.gt(ethBalanceBefore / 1e18);
        });

        it('... should unwrap weth -> eth in a recipe', async () => {
            const amount = hre.ethers.utils.parseUnits('2', 18);

            await sendEther(senderAcc, proxy.address, '2');

            const unwrapRecipe = new dfs.Recipe('UnwrapRecipe', [
                new dfs.actions.basic.WrapEthAction(amount),
                new dfs.actions.basic.UnwrapEthAction(amount, senderAcc.address),
            ]);

            const functionData = unwrapRecipe.encodeForDsProxyCall();

            const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth proxy before: ${ethBalanceBefore / 1e18}`);

            await executeAction('RecipeExecutor', functionData[1], proxy);

            const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth proxy after: ${ethBalanceAfter / 1e18}`);

            expect(ethBalanceAfter / 1e18).to.be.gt(ethBalanceBefore / 1e18);
        });
    });
};
const sumInputsTest = async () => {
    describe('Sum-Inputs', function () {
        this.timeout(80000);

        let recipeExecutorAddr; let senderAcc; let proxy;

        before(async () => {
            recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should sum two inputs in a recipe', async () => {
            await setBalance(WETH_ADDRESS, proxy.address, hre.ethers.utils.parseUnits('0', 18));
            await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
            await approve(WETH_ADDRESS, proxy.address);

            const a = hre.ethers.utils.parseUnits('2', 18);
            const b = hre.ethers.utils.parseUnits('7', 18);
            const testSumInputs = new dfs.Recipe('TestSumInputs', [
                new dfs.actions.basic.SumInputsAction(a, b),
                new dfs.actions.basic.PullTokenAction(WETH_ADDRESS, senderAcc.address, '$1'),
            ]);
            const functionData = testSumInputs.encodeForDsProxyCall()[1];

            await executeAction('RecipeExecutor', functionData, proxy);

            expect(await balanceOf(WETH_ADDRESS, proxy.address)).to.be.eq(hre.ethers.utils.parseUnits('9', 18));
        });

        it('... should revert in event of overflow', async () => {
            await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
            await approve(WETH_ADDRESS, proxy.address);

            const a = hre.ethers.utils.parseUnits('1', 18);
            const b = hre.ethers.constants.MaxUint256;
            const testSumInputs = new dfs.Recipe('TestSumInputs', [
                new dfs.actions.basic.SumInputsAction(a, b),
                new dfs.actions.basic.PullTokenAction(WETH_ADDRESS, senderAcc.address, '$1'),
            ]);
            const functionData = testSumInputs.encodeForDsProxyCall()[1];

            await expect(proxy['execute(address,bytes)'](recipeExecutorAddr, functionData)).to.be.reverted;
        });
    });
};
const subInputsTest = async () => {
    describe('Sub-Inputs', function () {
        this.timeout(80000);

        let recipeExecutorAddr; let senderAcc; let proxy;

        before(async () => {
            recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should sub two inputs in a recipe', async () => {
            await setBalance(WETH_ADDRESS, proxy.address, hre.ethers.utils.parseUnits('0', 18));
            await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
            await approve(WETH_ADDRESS, proxy.address);

            const a = hre.ethers.utils.parseUnits('9', 18);
            const b = hre.ethers.utils.parseUnits('2', 18);
            const testSubInputs = new dfs.Recipe('TestSubInputs', [
                new dfs.actions.basic.SubInputsAction(a, b),
                new dfs.actions.basic.PullTokenAction(WETH_ADDRESS, senderAcc.address, '$1'),
            ]);
            const functionData = testSubInputs.encodeForDsProxyCall()[1];

            await executeAction('RecipeExecutor', functionData, proxy);

            expect(await balanceOf(WETH_ADDRESS, proxy.address)).to.be.eq(hre.ethers.utils.parseUnits('7', 18));
        });

        it('... should revert in event of underflow', async () => {
            await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
            await approve(WETH_ADDRESS, proxy.address);

            const a = hre.ethers.utils.parseUnits('1', 18);
            const b = hre.ethers.utils.parseUnits('5', 18);
            const testSubInputs = new dfs.Recipe('TestSubInputs', [
                new dfs.actions.basic.SubInputsAction(a, b),
                new dfs.actions.basic.PullTokenAction(WETH_ADDRESS, senderAcc.address, '$1'),
            ]);
            const functionData = testSubInputs.encodeForDsProxyCall()[1];

            await expect(proxy['execute(address,bytes)'](recipeExecutorAddr, functionData)).to.be.reverted;
        });
    });
};

const sendTokenTest = async () => {
    describe('Send-Token', function () {
        this.timeout(80000);

        let senderAcc; let proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
        it('... should send tokens direct action', async () => {
            const wrapEthAddr = await getAddrFromRegistry('WrapEth');
            const wrapEthAction = new dfs.actions.basic.WrapEthAction(hre.ethers.utils.parseUnits('4', 18));
            const functionData = wrapEthAction.encodeForDsProxyCall()[1];

            // clean any WETH balance from earlier tests
            await setBalance(WETH_ADDRESS, proxy.address, hre.ethers.utils.parseUnits('0', 18));
            await setBalance(WETH_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('0', 18));

            await proxy['execute(address,bytes)'](wrapEthAddr, functionData, {
                value: hre.ethers.utils.parseUnits('4', 18),
                gasLimit: 3000000,
            });
            const sendTokenAction = new dfs.actions.basic.SendTokenAction(
                WETH_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('3', 18),
            );
            const sendTokenData = sendTokenAction.encodeForDsProxyCall()[1];

            await executeAction('SendToken', sendTokenData, proxy);
            expect(await balanceOf(WETH_ADDRESS, senderAcc.address)).to.be.eq(hre.ethers.utils.parseUnits('3', 18));
        });

        it('... should send tokens direct action uint256.max', async () => {
            const sendTokenAction = new dfs.actions.basic.SendTokenAction(
                WETH_ADDRESS, senderAcc.address, hre.ethers.constants.MaxUint256,
            );
            const sendTokenData = sendTokenAction.encodeForDsProxyCall()[1];

            await executeAction('SendToken', sendTokenData, proxy);
            expect(await balanceOf(WETH_ADDRESS, senderAcc.address)).to.be.eq(hre.ethers.utils.parseUnits('4', 18));
        });
    });
};

const approveTokenTest = async () => {
    describe('Approve-Token', function () {
        this.timeout(80000);

        let senderAcc; let proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
        it('... should approve DSProxy WETH for someone else to spend', async () => {
            const weth = getAssetInfo('WETH');
            const wethAddress = weth.address;
            const amount = hre.ethers.utils.parseUnits('10', 18);
            const approveAction = new dfs.actions.basic.ApproveTokenAction(
                wethAddress, senderAcc.address, amount,
            );
            const functionData = approveAction.encodeForDsProxyCall()[1];

            // Set WETH Balances
            await setBalance(wethAddress, proxy.address, amount);
            await setBalance(wethAddress, senderAcc.address, hre.ethers.utils.parseUnits('0', 18));
            await executeAction('ApproveToken', functionData, proxy);

            let tokenContract = await hre.ethers.getContractAt('IERC20', wethAddress);
            tokenContract = tokenContract.connect(senderAcc);
            await tokenContract.transferFrom(proxy.address, senderAcc.address, amount);
            expect(await balanceOf(wethAddress, senderAcc.address)).to.be.eq(amount);
            expect(await balanceOf(wethAddress, proxy.address)).to.be.eq('0');
        });
        it('... should approve DSProxy USDT for someone else to spend', async () => {
            const usdt = getAssetInfo('USDT');
            const usdtAddress = usdt.address;
            const amount = hre.ethers.utils.parseUnits('10', 6);
            const approveAction = new dfs.actions.basic.ApproveTokenAction(
                usdtAddress, senderAcc.address, amount,
            );
            const functionData = approveAction.encodeForDsProxyCall()[1];

            // Set USDT Balances
            await setBalance(usdtAddress, proxy.address, amount);
            await setBalance(usdtAddress, senderAcc.address, hre.ethers.utils.parseUnits('0', 18));
            await executeAction('ApproveToken', functionData, proxy);

            let tokenContract = await hre.ethers.getContractAt('IERC20', usdtAddress);
            tokenContract = tokenContract.connect(senderAcc);
            await tokenContract.transferFrom(proxy.address, senderAcc.address, amount);
            expect(await balanceOf(usdtAddress, senderAcc.address)).to.be.eq(amount);
            expect(await balanceOf(usdtAddress, proxy.address)).to.be.eq('0');
        });
    });
};

const sendTokensTest = async () => {
    describe('Send-Tokens', function () {
        this.timeout(80000);

        let senderAcc; let proxy; let snapshotId;
        const tokens = [WETH_ADDRESS, DAI_ADDR, LUSD_ADDR, WBTC_ADDR];
        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
            await setBalance(WETH_ADDRESS, proxy.address, hre.ethers.utils.parseUnits('10', 18));
            await setBalance(DAI_ADDR, proxy.address, hre.ethers.utils.parseUnits('100', 18));
            await setBalance(LUSD_ADDR, proxy.address, hre.ethers.utils.parseUnits('100', 18));
            await setBalance(WBTC_ADDR, proxy.address, hre.ethers.utils.parseUnits('1', 8));
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });
        for (let i = 0; i < tokens.length; i++) {
            it(`... should send ${i + 1} tokens using recipe made out of SendToken Actions`, async () => {
                const recipe = new dfs.Recipe('SendTokenRecipe');
                // This is here only so on both sides it's recipe
                recipe.addAction(
                    new dfs.actions.basic.TokenBalanceAction(DAI_ADDR, senderAcc.address),
                );
                for (let j = 0; j <= i; j++) {
                    const sendTokenAction = new dfs.actions.basic.SendTokenAction(
                        tokens[j], senderAcc.address, hre.ethers.constants.MaxUint256,
                    );
                    recipe.addAction(sendTokenAction);
                }

                const functionData = recipe.encodeForDsProxyCall();
                await executeAction('RecipeExecutor', functionData[1], proxy);
            });
            it(`... should send ${i + 1} tokens using one SendTokens action`, async () => {
                const recipe = new dfs.Recipe('SendTokensRecipe');
                recipe.addAction(
                    new dfs.actions.basic.TokenBalanceAction(DAI_ADDR, senderAcc.address),
                );
                const tokensToUse = [];
                const receiversToUse = [];
                const amountsToUse = [];

                for (let j = 0; j <= i; j++) {
                    tokensToUse.push(tokens[j]);
                    receiversToUse.push(senderAcc.address);
                    amountsToUse.push(hre.ethers.constants.MaxUint256);
                }
                const sendTokensAction = new dfs.actions.basic.SendTokensAction(
                    tokensToUse, receiversToUse, amountsToUse,
                );
                recipe.addAction(sendTokensAction);

                const functionData = recipe.encodeForDsProxyCall();
                await executeAction('RecipeExecutor', functionData[1], proxy);
            });
        }
    });
};

const sendTokenAndUnwrapTest = async () => {
    describe('Send-Token-And-Unwrap', function () {
        this.timeout(80000);

        let senderAcc; let proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });
        it('... should send tokens direct action', async () => {
            // clean any WETH balance from earlier tests
            await setBalance(WETH_ADDRESS, proxy.address, hre.ethers.utils.parseUnits('0', 18));

            await depositToWeth(hre.ethers.utils.parseUnits('4', 18));
            await send(WETH_ADDRESS, proxy.address, hre.ethers.utils.parseUnits('4', 18));

            const sendTokenAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
                WETH_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('3', 18),
            );
            const sendTokenData = sendTokenAction.encodeForDsProxyCall()[1];

            const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth before closing : ${ethBalanceBefore.toString() / 1e18}`);

            await executeAction('SendTokenAndUnwrap', sendTokenData, proxy);

            const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth after closing : ${ethBalanceAfter.toString() / 1e18}`);

            expect(ethBalanceAfter / 1e18).to.be.closeTo((ethBalanceBefore / 1e18) + 3, 0.1);
        });

        it('... should send tokens direct action uint256.max', async () => {
            const sendTokenAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
                WETH_ADDRESS, senderAcc.address, hre.ethers.constants.MaxUint256,
            );
            const sendTokenData = sendTokenAction.encodeForDsProxyCall()[1];

            const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth before closing : ${ethBalanceBefore.toString() / 1e18}`);

            await executeAction('SendTokenAndUnwrap', sendTokenData, proxy);

            const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth after closing : ${ethBalanceAfter.toString() / 1e18}`);

            expect(ethBalanceAfter / 1e18).to.be.gt(ethBalanceBefore / 1e18);
        });

        it('... should send DAI direct action', async () => {
            await setBalance(DAI_ADDR, proxy.address, hre.ethers.utils.parseUnits('0', 18));
            await setBalance(DAI_ADDR, proxy.address, hre.ethers.utils.parseUnits('1000', 18));

            const sendTokenAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
                DAI_ADDR, senderAcc.address, hre.ethers.utils.parseUnits('300', 18),
            );
            const sendTokenData = sendTokenAction.encodeForDsProxyCall()[1];

            const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
            console.log(`Dai before closing : ${daiBalanceBefore.toString() / 1e18}`);

            await executeAction('SendTokenAndUnwrap', sendTokenData, proxy);

            const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
            console.log(`Dai after closing : ${daiBalanceAfter.toString() / 1e18}`);

            expect(daiBalanceAfter / 1e18).to.be.closeTo((daiBalanceBefore / 1e18) + 300, 0.00001);
        });

        it('... should send DAI direct action uint256.max', async () => {
            const sendTokenAction = new dfs.actions.basic.SendTokenAndUnwrapAction(
                DAI_ADDR, senderAcc.address, hre.ethers.constants.MaxUint256,
            );
            const sendTokenData = sendTokenAction.encodeForDsProxyCall()[1];

            const daiBalanceBefore = await balanceOf(DAI_ADDR, senderAcc.address);
            console.log(`Dai before closing : ${daiBalanceBefore.toString() / 1e18}`);

            await executeAction('SendTokenAndUnwrap', sendTokenData, proxy);

            const daiBalanceAfter = await balanceOf(DAI_ADDR, senderAcc.address);
            console.log(`Dai after closing : ${daiBalanceAfter.toString() / 1e18}`);

            expect(daiBalanceAfter / 1e18).to.be.closeTo((daiBalanceBefore / 1e18) + 700, 0.00001);
        });
    });
};

const pullTokenTest = async () => {
    describe('Pull-Token', function () {
        this.timeout(80000);

        let senderAcc; let proxy;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);
        });

        it('... should pull tokens direct action', async () => {
            // clean any WETH balance from earlier tests
            await setBalance(WETH_ADDRESS, proxy.address, hre.ethers.utils.parseUnits('0', 18));
            await setBalance(WETH_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('0', 18));

            await depositToWeth(hre.ethers.utils.parseUnits('10', 18));
            await approve(WETH_ADDRESS, proxy.address);
            const pullTokenAction = new dfs.actions.basic.PullTokenAction(
                WETH_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('3', 18),
            );
            const pullTokenData = pullTokenAction.encodeForDsProxyCall()[1];

            await executeAction('PullToken', pullTokenData, proxy);
            expect(await balanceOf(WETH_ADDRESS, proxy.address)).to.be.eq(hre.ethers.utils.parseUnits('3', 18));
        });

        it('... should pull tokens uint256.max direct action', async () => {
            const pullTokenAction = new dfs.actions.basic.PullTokenAction(
                WETH_ADDRESS, senderAcc.address, hre.ethers.constants.MaxUint256,
            );
            const pullTokenData = pullTokenAction.encodeForDsProxyCall()[1];

            await executeAction('PullToken', pullTokenData, proxy);

            expect(await balanceOf(WETH_ADDRESS, proxy.address)).to.be.eq(hre.ethers.utils.parseUnits('10', 18));
        });
    });
};

const changeOwnerTest = async () => {
    describe('Change owner', function () {
        this.timeout(80000);

        let senderAcc; let senderAcc2; let proxy;

        const ADMIN_VAULT = addrs[network].ADMIN_VAULT;
        const ADMIN_ACC = addrs[network].ADMIN_ACC;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            senderAcc2 = (await hre.ethers.getSigners())[1];
            proxy = await getProxy(senderAcc.address);

            if (network === 'mainnet') {
                // DFSProxyRegistry must be owned by DFSProxyRegistryController on mainnet
                await sendEther(senderAcc, ADMIN_ACC, '1');
                await impersonateAccount(ADMIN_ACC);

                const signer = await hre.ethers.provider.getSigner(ADMIN_ACC);

                const adminVaultInstance = await hre.ethers.getContractFactory('AdminVault', signer);
                const adminVault = await adminVaultInstance.attach(ADMIN_VAULT);
                adminVault.connect(signer);
                // change owner in registry to dfsRegController
                await adminVault.changeOwner(addrs[network].DFS_REG_CONTROLLER);
                await stopImpersonatingAccount(ADMIN_ACC);
            }
        });

        it('... should change owner of users DSProxy', async () => {
            const newOwner = senderAcc2.address;

            const oldOwner = await proxy.owner();

            await changeProxyOwner(proxy, newOwner);

            const changedOwner = await proxy.owner();
            console.log(oldOwner, changedOwner);

            expect(changedOwner).to.be.eq(newOwner);
        });

        it('... should change owner back', async () => {
            const newOwner = senderAcc.address;

            proxy = proxy.connect(senderAcc2);

            await changeProxyOwner(proxy, newOwner);

            const changedOwner = await proxy.owner();

            expect(changedOwner).to.be.eq(newOwner);
            await resetForkToBlock();
        });
    });
};
const automationV2UnsubTest = async () => {
    describe('AutomationV2-Unsubscribe', function () {
        this.timeout(1000000);

        before(async () => {
            const blockNum = 14368070;

            await resetForkToBlock(blockNum);
            expect(
                await hre.ethers.provider.getBlockNumber(),
                `This test should be ran at block number ${blockNum}`,
            ).to.eq(blockNum);
            await redeploy('AutomationV2Unsub');
        });

        it('... should unsubscribe Mcd subscription', async () => {
            const mcdSubscriptionsAddr = '0xC45d4f6B6bf41b6EdAA58B01c4298B8d9078269a';
            const CDP_OWNER_ACC = '0x8eceBBF3fA6d894476Cd9DD34D6A53DdD185233e';
            const cdpId = 20648;

            await impersonateAccount(CDP_OWNER_ACC);

            const ownerAcc = hre.ethers.provider.getSigner(CDP_OWNER_ACC);
            const ownerProxy = await getProxy(CDP_OWNER_ACC);
            const impersonatedProxy = ownerProxy.connect(ownerAcc);

            const mcdSubscriptions = new hre.ethers.Contract(
                mcdSubscriptionsAddr,
                ISubscriptionsABI,
                ownerAcc,
            );

            // eslint-disable-next-line no-unused-expressions
            expect(
                (await mcdSubscriptions['subscribersPos(uint256)'](cdpId)).subscribed,
                'The proxy isn\'t subscribed.',
            ).to.be.true;

            await automationV2Unsub(impersonatedProxy, '0', cdpId);

            // eslint-disable-next-line no-unused-expressions
            expect(
                (await mcdSubscriptions['subscribersPos(uint256)'](cdpId)).subscribed,
                'Couldn\'t unsubscribe the proxy.',
            ).to.be.false;

            await stopImpersonatingAccount(CDP_OWNER_ACC);
        });

        it('... should unsubscribe Compound subscription', async () => {
            const compoundSubscriptionsAddr = '0x52015EFFD577E08f498a0CCc11905925D58D6207';
            const COMPOUND_OWNER_ACC = '0xe10eB997d51C2AFCd3e0F80e0a984949b2ed3349';

            await impersonateAccount(COMPOUND_OWNER_ACC);

            const ownerAcc = hre.ethers.provider.getSigner(COMPOUND_OWNER_ACC);
            const ownerProxy = await getProxy(COMPOUND_OWNER_ACC);
            const impersonatedProxy = ownerProxy.connect(ownerAcc);

            const compoundSubscriptions = new hre.ethers.Contract(
                compoundSubscriptionsAddr,
                ISubscriptionsABI,
                ownerAcc,
            );

            // eslint-disable-next-line no-unused-expressions
            expect(
                (await compoundSubscriptions['subscribersPos(address)'](ownerProxy.address)).subscribed,
                'The proxy isn\'t subscribed.',
            ).to.be.true;

            await automationV2Unsub(impersonatedProxy, '1');

            // eslint-disable-next-line no-unused-expressions
            expect(
                (await compoundSubscriptions['subscribersPos(address)'](ownerProxy.address)).subscribed,
                'Couldn\'t unsubscribe the proxy.',
            ).to.be.false;

            await stopImpersonatingAccount(COMPOUND_OWNER_ACC);
        });

        it('... should unsubscribe Aave subscription', async () => {
            const aaveSubscriptionsAddr = '0x6B25043BF08182d8e86056C6548847aF607cd7CD';
            const AAVE_OWNER_ACC = '0x160FF555a7836d8bC027eDA92Fb524BecE5C9B88';

            await impersonateAccount(AAVE_OWNER_ACC);

            const ownerAcc = hre.ethers.provider.getSigner(AAVE_OWNER_ACC);
            const ownerProxy = await getProxy(AAVE_OWNER_ACC);
            const impersonatedProxy = ownerProxy.connect(ownerAcc);

            const aaveSubscriptions = new hre.ethers.Contract(
                aaveSubscriptionsAddr,
                ISubscriptionsABI,
                ownerAcc,
            );

            // eslint-disable-next-line no-unused-expressions
            expect(
                (await aaveSubscriptions['subscribersPos(address)'](ownerProxy.address)).subscribed,
                'The proxy isn\'t subscribed.',
            ).to.be.true;

            await automationV2Unsub(impersonatedProxy, '2');

            // eslint-disable-next-line no-unused-expressions
            expect(
                (await aaveSubscriptions['subscribersPos(address)'](ownerProxy.address)).subscribed,
                'Couldn\'t unsubscribe the proxy.',
            ).to.be.false;

            await stopImpersonatingAccount(AAVE_OWNER_ACC);
        });
    });
};

const updateSubDataTest = async () => {
    describe('Update Sub Data', function () {
        this.timeout(1000000);

        let senderAcc;
        let proxy;
        let botAcc;
        let vaultId;
        let subStorage;
        let subId;
        let flAmount;
        let subStorageAddr;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            await redeployCore();

            await redeploy('SendToken');
            await redeploy('McdRatioTrigger');
            await redeploy('DFSSell');
            await redeploy('McdView');
            await redeploy('GasFeeTaker');
            await redeploy('McdRatioCheck');

            subStorageAddr = await getAddrFromRegistry('SubStorage');
            subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

            await redeploy('McdSupply');
            await redeploy('McdWithdraw');
            await redeploy('McdGenerate');
            await redeploy('McdPayback');
            await redeploy('McdOpen');
            await redeploy('ChainLinkPriceTrigger');
            await addBotCaller(botAcc.address);
            await getAddrFromRegistry('FLMaker');
            proxy = await getProxy(senderAcc.address);
        });

        it('... should update sub data', async () => {
            const vaultColl = fetchAmountinUSDPrice('WETH', '40000');
            const amountDai = fetchAmountinUSDPrice('DAI', '18000');
            vaultId = await openVault(
                proxy,
                'ETH-A',
                vaultColl,
                amountDai,
            );
            console.log(`VaultId: ${vaultId}`);
            console.log(`Vault collateral${vaultColl}`);
            console.log(`Vault debt${amountDai}`);
            flAmount = (parseFloat(amountDai) + 1).toString();
            flAmount = hre.ethers.utils.parseUnits(flAmount, 18);

            await openStrategyAndBundleStorage();

            const strategyData = createMcdCloseStrategy();
            const strategyId = await createStrategy(...strategyData, false);

            const currPrice = await getChainLinkPrice(ETH_ADDR);
            let strategySub;
            const targetPrice = currPrice - 100; // Target is smaller so we can execute it
            ({ subId, strategySub } = await subMcdCloseStrategy(
                vaultId,
                proxy,
                targetPrice,
                WETH_ADDRESS,
                RATIO_STATE_OVER,
                strategyId,
            ));
            console.log(subId);
            const subHashBefore = await subStorage.getSub(subId);

            const triggerData = await createChainLinkPriceTrigger(
                WETH_ADDRESS, currPrice + 100, RATIO_STATE_OVER,
            );
            strategySub[2] = [triggerData];

            await updateSubData(proxy, subId, strategySub);
            const subHashAfter = await subStorage.getSub(subId);

            expect(subHashAfter.strategySubHash).to.not.have.string(subHashBefore.strategySubHash);
        });
    });
};

const toggleSubDataTest = async () => {
    describe('Toggle Sub', function () {
        this.timeout(1000000);

        let senderAcc;
        let proxy;
        let subId;
        let subStorageAddr;
        let subStorage;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];

            await redeployCore();

            subStorageAddr = await getAddrFromRegistry('SubStorage');
            subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

            proxy = await getProxy(senderAcc.address);
        });

        it('... should create a dummy strategy', async () => {
            const abiCoder = new hre.ethers.utils.AbiCoder();

            const dummyStrategy = new dfs.Strategy('DummyStrategy');

            dummyStrategy.addSubSlot('&amount', 'uint256');

            const pullTokenAction = new dfs.actions.basic.PullTokenAction(
                WETH_ADDRESS, '&eoa', '&amount',
            );

            dummyStrategy.addTrigger((new dfs.triggers.GasPriceTrigger(0)));
            dummyStrategy.addAction(pullTokenAction);

            const callData = dummyStrategy.encodeForDsProxyCall();

            const strategyId = await createStrategy(...callData, false);

            const amountEncoded = abiCoder.encode(['uint256'], [0]);

            const triggerData = abiCoder.encode(['uint256'], [0]);
            const strategySub = [strategyId, false, [triggerData], [amountEncoded]];

            subId = await subToStrategy(proxy, strategySub);

            const storedSub = await subStorage.getSub(subId);
            expect(storedSub.isEnabled).to.be.eq(true);
        });

        it('... should deactivate the strategy', async () => {
            const disableSub = new dfs.actions.basic.ToggleSubAction(subId, false);

            const functionData = disableSub.encodeForDsProxyCall()[1];

            await executeAction('ToggleSub', functionData, proxy);

            const storedSub = await subStorage.getSub(subId);
            expect(storedSub.isEnabled).to.be.eq(false);
        });

        it('... should activate the strategy again', async () => {
            const disableSub = new dfs.actions.basic.ToggleSubAction(subId, true);

            const functionData = disableSub.encodeForDsProxyCall()[1];

            await executeAction('ToggleSub', functionData, proxy);

            const storedSub = await subStorage.getSub(subId);
            expect(storedSub.isEnabled).to.be.eq(true);
        });
    });
};

const transferNFTTest = async () => {
    describe('Transfer NFT', function () {
        this.timeout(1000000);

        let senderAcc;
        let proxy;
        let bondID;
        let chickenBondsView;
        let bondNft;

        before(async () => {
            senderAcc = (await hre.ethers.getSigners())[0];

            proxy = await getProxy(senderAcc.address);

            bondNft = await hre.ethers.getContractAt('IERC721', BOND_NFT_ADDR);

            chickenBondsView = await redeploy('ChickenBondsView');

            const lusdAmount = hre.ethers.utils.parseUnits('1000', 18);
            await setBalance(LUSD_ADDR, senderAcc.address, lusdAmount);

            await createChickenBond(proxy, lusdAmount, senderAcc.address);

            const bonds = await chickenBondsView.getUsersBonds(proxy.address);
            bondID = bonds[bonds.length - 1].bondID.toString();
        });

        it('... should transfer a nft from proxy', async () => {
            const ownerBefore = await getNftOwner(BOND_NFT_ADDR, bondID);

            await transferNFT(proxy, BOND_NFT_ADDR, bondID, proxy.address, senderAcc.address);

            const ownerAfter = await getNftOwner(BOND_NFT_ADDR, bondID);

            expect(ownerBefore).to.be.eq(proxy.address);
            expect(ownerAfter).to.be.eq(senderAcc.address);
        });

        it('... should pull a nft from sender', async () => {
            const ownerBefore = await getNftOwner(BOND_NFT_ADDR, bondID);

            await bondNft.setApprovalForAll(proxy.address, true);

            await transferNFT(proxy, BOND_NFT_ADDR, bondID, senderAcc.address, proxy.address);

            const ownerAfter = await getNftOwner(BOND_NFT_ADDR, bondID);

            expect(ownerBefore).to.be.eq(senderAcc.address);
            expect(ownerAfter).to.be.eq(proxy.address);
        });
    });
};

const kingClaimTest = async () => {
    describe('Claim KING token', function () {
        this.timeout(1000000);

        let senderAcc;
        let proxy;
        let CLAIMER_EOA;

        before(async () => {
            await resetForkToBlock(21868568);
            await redeploy('KingClaim');

            CLAIMER_EOA = '0xd7215DbBd6e595a57e4dDc7786EF068F8dA8B564';
            const CLAIMER_SW = '0x6a1F4f0AD047C7050F7ddc0563c0aaD3931C4771';

            // send some eth to senderAcc
            const zeroAddress = hre.ethers.constants.AddressZero;
            const zeroAcc = await hre.ethers.provider.getSigner(zeroAddress);
            await impersonateAccount(zeroAddress);
            await sendEther(zeroAcc, CLAIMER_EOA, '5');

            await impersonateAccount(CLAIMER_EOA);
            senderAcc = await hre.ethers.provider.getSigner(CLAIMER_EOA);
            proxy = await hre.ethers.getContractAt('IDSProxy', CLAIMER_SW);
            proxy = proxy.connect(senderAcc);
        });

        it('... should claim KING token from proxy to eoa', async () => {
            const amount = '54828777210681748232';
            const root = '0x2643c31ec7b7d9d1e8aa5202453912b1d02fd33c91b2b07c4dc3fc5965e473c5';
            const proofs = [
                '0xce3b0e9d8e457ea2f34674437c4f1545124cbc5c8ba232cc00a4df86d4bca925',
                '0x9832eba0cfbcd5d45167002e2731115a909e6f137ec473742e5690b09fbca0c2',
                '0xc57ecb7b9498e59468dd8d4e4f08b2378a1ecb6f432ae213cf4bd4e83b85196b',
                '0xf2504cde069ba76e707c4dd232c1d3a98e0864cd45862ca049c2dddbe187646d',
                '0xe00a819ae4d6085599af1362024d87235aae09a61bd6743d4b426f08596907eb',
                '0x7abad045ad476d86a34ffff1e011fcebf2e056e14a120585359590d6d8b380ba',
                '0xe736f578c28e41b97fac9ed776299243718faa403f0cc2b8d09f429ae83eafee',
                '0x5d8112314b3c49c901483d9a58bb85b3526b5f9b243cf6f8bb5360f17a33fe57',
                '0xf7529a3b24d2481c893f391fc0f55d6dc86df5ae588dafcd3e6d92ab649510fe',
                '0x24f1c608f3073ac6155595b27f7532a6a6fa42acda0c079bc373016d01ccb255',
                '0x2dfba18c8a9129cb5a4315cea917e64107bf0d42b0ccf462809d485148d95211',
                '0x5490528d35e6367e477ed62ba4aae078f4c04e370336c4a899f022cbcdb738d8',
                '0x07cc8ffd39c9a1fdc8b36c70df7f980c18d2a22eb90095e0b01963bff4e16738',
                '0x1dd856a0ae64cbf033ae41de4ae796d94c0a7c7b8ae59158ef22994051a6ecb4',
                '0xf1e9c75979ef59d6eba5cb84a528c1781f2aa0bc6dd3d910c7db0fd16036c856',
                '0x3d07078075364fe963edacb88bea86f59af72035777a6c70b4ef68c5ee6b7bfc',
                '0x937fc65e59dee9333ca48b9e7856503d9ee7d4bb6a976237adf78204955eb2cd',
                '0x31db96f1d6414944499d1744f6f248b702c9dc15ff7dd9602313ef634d023fb2',
                '0x9c93e0557e3de0a70f3fa159063624ae636966ace1605b3504011c90e55a0c1e',
            ];
            const balanceBefore = await balanceOf('0x8F08B70456eb22f6109F57b8fafE862ED28E6040', CLAIMER_EOA);
            await kingClaim(proxy, CLAIMER_EOA, amount, root, proofs);
            const balanceAfter = await balanceOf('0x8F08B70456eb22f6109F57b8fafE862ED28E6040', CLAIMER_EOA);
            console.log(balanceAfter);
            expect((balanceAfter).sub(balanceBefore)).to.be.eq(amount);
        });
    });
};

const deployUtilsActionsContracts = async () => {
    await redeploy('SendTokenAndUnwrap');
    await redeploy('WrapEth');
    await redeploy('UnwrapEth');
    await redeploy('DFSSell');
    await redeploy('RecipeExecutor');
    await redeploy('PullToken');
    await redeploy('SumInputs');
    await redeploy('SubInputs');
    await redeploy('SendToken');
    await redeploy('UniswapWrapperV3');
    await redeploy('ChangeProxyOwner');
    await redeploy('UpdateSub');
    await redeploy('ToggleSub');
    await redeploy('TransferNFT');
    await redeploy('KingClaim');
};

const utilsActionsFullTest = async () => {
    await deployUtilsActionsContracts();
    await toggleSubDataTest();
    await sendTokenAndUnwrapTest();
    await wrapEthTest();
    await unwrapEthTest();
    await sumInputsTest();
    await subInputsTest();
    await sendTokenTest();
    await pullTokenTest();
    await updateSubDataTest();
    await automationV2UnsubTest();
    await changeOwnerTest();
    await transferNFTTest();
};

module.exports = {
    wrapEthTest,
    unwrapEthTest,
    sumInputsTest,
    subInputsTest,
    sendTokenTest,
    changeOwnerTest,
    pullTokenTest,
    automationV2UnsubTest,
    utilsActionsFullTest,
    sendTokenAndUnwrapTest,
    updateSubDataTest,
    toggleSubDataTest,
    transferNFTTest,
    sendTokensTest,
    approveTokenTest,
    permitTokenTest,
    kingClaimTest,
};
