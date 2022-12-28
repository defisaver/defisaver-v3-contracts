const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const ISubscriptionsABI = require('../../artifacts/contracts/interfaces/ISubscriptions.sol/ISubscriptions.json').abi;
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
    DFS_REG_CONTROLLER,
    ADMIN_ACC,
    DAI_ADDR,
    LUSD_ADDR,
    BOND_NFT_ADDR,
    takeSnapshot,
    revertToSnapshot,
    WBTC_ADDR,
} = require('../utils');

const { fetchMakerAddresses } = require('../utils-mcd');
const {
    changeProxyOwner,
    automationV2Unsub,
    executeAction,
    openVault,
    updateSubData,
    createChickenBond,
    transferNFT,
} = require('../actions');
const { addBotCaller, createStrategy, subToStrategy } = require('../utils-strategies');
const { createMcdCloseStrategy } = require('../strategies');
const { subMcdCloseStrategy } = require('../strategy-subs');
const { RATIO_STATE_OVER, createChainLinkPriceTrigger } = require('../triggers');

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

        const ADMIN_VAULT = '0xCCf3d848e08b94478Ed8f46fFead3008faF581fD';

        before(async () => {
            await impersonateAccount(ADMIN_ACC);

            const signer = await hre.ethers.provider.getSigner(ADMIN_ACC);

            const adminVaultInstance = await hre.ethers.getContractFactory('AdminVault', signer);
            const adminVault = await adminVaultInstance.attach(ADMIN_VAULT);

            adminVault.connect(signer);

            // change owner in registry to dfsRegController
            await adminVault.changeOwner(DFS_REG_CONTROLLER);

            await stopImpersonatingAccount(ADMIN_ACC);

            senderAcc = (await hre.ethers.getSigners())[0];
            senderAcc2 = (await hre.ethers.getSigners())[1];
            proxy = await getProxy(senderAcc.address);
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
            const strategyId = await createStrategy(proxy, ...strategyData, false);

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

            const strategyId = await createStrategy(proxy, ...callData, false);

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
};
