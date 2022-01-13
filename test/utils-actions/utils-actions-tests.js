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
    WETH_ADDRESS,
    setNewExchangeWrapper,
    sendEther,
    ETH_ADDR,
    depositToWeth,
    send,
    approve,
    stopImpersonatingAccount,
    DFS_REG_CONTROLLER,
    ADMIN_ACC,
    impersonateAccount,
    setBalance,
    resetForkToBlock,
} = require('../utils');

const { fetchMakerAddresses } = require('../utils-mcd');
const { changeProxyOwner, automationV2Unsub } = require('../actions');

const wrapEthTest = async () => {
    describe('Wrap-Eth', function () {
        this.timeout(80000);

        let makerAddresses; let senderAcc; let proxy; let
            uniWrapperAddr;
        let taskExecutorAddr;

        before(async () => {
            uniWrapperAddr = await getAddrFromRegistry('UniswapWrapperV3');

            makerAddresses = await fetchMakerAddresses();
            taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

            // eslint-disable-next-line prefer-destructuring
            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await setNewExchangeWrapper(senderAcc, uniWrapperAddr);
        });
        it('... should wrap native Eth to Weth direct action', async () => {
            const wrapEthAddr = await getAddrFromRegistry('WrapEth');

            const amount = hre.ethers.utils.parseUnits('2', 18);

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
            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], {
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

        let senderAcc; let proxy; let
            uniWrapperAddr; let taskExecutorAddr;

        before(async () => {
            uniWrapperAddr = await getAddrFromRegistry('UniswapWrapperV3');

            taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');

            senderAcc = (await hre.ethers.getSigners())[0];
            proxy = await getProxy(senderAcc.address);

            await setNewExchangeWrapper(senderAcc, uniWrapperAddr);
        });
        it('... should unwrap native WEth to Eth direct action', async () => {
            const unwrapEthAddr = await getAddrFromRegistry('UnwrapEth');

            const amount = hre.ethers.utils.parseUnits('2', 18);
            await depositToWeth(amount);

            await send(WETH_ADDRESS, proxy.address, amount);

            const unwrapEthAction = new dfs.actions.basic.UnwrapEthAction(
                amount, senderAcc.address,
            );
            const functionData = unwrapEthAction.encodeForDsProxyCall()[1];

            const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth proxy before: ${ethBalanceBefore / 1e18}`);

            await proxy['execute(address,bytes)'](unwrapEthAddr, functionData, { gasLimit: 3000000 });

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

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000 });

            const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);
            console.log(`Eth proxy after: ${ethBalanceAfter / 1e18}`);

            expect(ethBalanceAfter / 1e18).to.be.gt(ethBalanceBefore / 1e18);
        });
    });
};
const sumInputsTest = async () => {
    describe('Sum-Inputs', function () {
        this.timeout(80000);

        let taskExecutorAddr; let senderAcc; let proxy;

        before(async () => {
            taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');
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

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData);

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

            await expect(proxy['execute(address,bytes)'](taskExecutorAddr, functionData)).to.be.reverted;
        });
    });
};
const subInputsTest = async () => {
    describe('Sub-Inputs', function () {
        this.timeout(80000);

        let taskExecutorAddr; let senderAcc; let proxy;

        before(async () => {
            taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');
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

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData);

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

            await expect(proxy['execute(address,bytes)'](taskExecutorAddr, functionData)).to.be.reverted;
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
            const sendTokenAddr = await getAddrFromRegistry('SendToken');
            const sendTokenAction = new dfs.actions.basic.SendTokenAction(
                WETH_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('3', 18),
            );
            const sendTokenData = sendTokenAction.encodeForDsProxyCall()[1];

            await proxy['execute(address,bytes)'](sendTokenAddr, sendTokenData);

            expect(await balanceOf(WETH_ADDRESS, senderAcc.address)).to.be.eq(hre.ethers.utils.parseUnits('3', 18));
        });

        it('... should send tokens direct action uint256.max', async () => {
            const sendTokenAddr = await getAddrFromRegistry('SendToken');
            const sendTokenAction = new dfs.actions.basic.SendTokenAction(
                WETH_ADDRESS, senderAcc.address, hre.ethers.constants.MaxUint256,
            );
            const sendTokenData = sendTokenAction.encodeForDsProxyCall()[1];

            await proxy['execute(address,bytes)'](sendTokenAddr, sendTokenData);

            expect(await balanceOf(WETH_ADDRESS, senderAcc.address)).to.be.eq(hre.ethers.utils.parseUnits('4', 18));
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
            const pullTokenAddr = await getAddrFromRegistry('PullToken');
            const pullTokenAction = new dfs.actions.basic.PullTokenAction(
                WETH_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('3', 18),
            );
            const pullTokenData = pullTokenAction.encodeForDsProxyCall()[1];

            await proxy['execute(address,bytes)'](pullTokenAddr, pullTokenData);

            expect(await balanceOf(WETH_ADDRESS, proxy.address)).to.be.eq(hre.ethers.utils.parseUnits('3', 18));
        });

        it('... should pull tokens uint256.max direct action', async () => {
            const pullTokenAddr = await getAddrFromRegistry('PullToken');
            const pullTokenAction = new dfs.actions.basic.PullTokenAction(
                WETH_ADDRESS, senderAcc.address, hre.ethers.constants.MaxUint256,
            );
            const pullTokenData = pullTokenAction.encodeForDsProxyCall()[1];

            await proxy['execute(address,bytes)'](pullTokenAddr, pullTokenData);

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
        });
    });
};
const automationV2UnsubTest = async () => {
    describe('AutomationV2-Unsubscribe', function () {
        this.timeout(1000000);

        before(async () => {
            await resetForkToBlock(13530577);
            const blockNum = 13530577;
            expect(
                await hre.ethers.provider.getBlockNumber(),
                `This test should be ran at block number ${blockNum}`,
            ).to.eq(blockNum);
            await redeploy('AutomationV2Unsub');
        });

        it('... should unsubscribe Mcd subscription', async () => {
            const mcdSubscriptionsAddr = '0xC45d4f6B6bf41b6EdAA58B01c4298B8d9078269a';
            const OWNER_ACC = '0xC48d4d15c2aE6037E9E9E4E79fC989feFAF4d6Fc';
            const cdpId = 12190;

            await impersonateAccount(OWNER_ACC);

            const ownerAcc = hre.ethers.provider.getSigner(OWNER_ACC);
            const ownerProxy = await getProxy(OWNER_ACC);
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

            await stopImpersonatingAccount(OWNER_ACC);
        });

        it('... should unsubscribe Compound subscription', async () => {
            const compoundSubscriptionsAddr = '0x52015EFFD577E08f498a0CCc11905925D58D6207';
            const OWNER_ACC = '0x18625142e5E576C524329B2568884099E4D9caC1';

            await impersonateAccount(OWNER_ACC);

            const ownerAcc = hre.ethers.provider.getSigner(OWNER_ACC);
            const ownerProxy = await getProxy(OWNER_ACC);
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

            await stopImpersonatingAccount(OWNER_ACC);
        });

        it('... should unsubscribe Aave subscription', async () => {
            const aaveSubscriptionsAddr = '0x6B25043BF08182d8e86056C6548847aF607cd7CD';
            const OWNER_ACC = '0x01d31Ad58827df47Fae2642AFFB5dE41b0891d93';

            await impersonateAccount(OWNER_ACC);

            const ownerAcc = hre.ethers.provider.getSigner(OWNER_ACC);
            const ownerProxy = await getProxy(OWNER_ACC);
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

            await stopImpersonatingAccount(OWNER_ACC);
        });
    });
};
const deployUtilsActionsContracts = async () => {
    await redeploy('WrapEth');
    await redeploy('DFSSell');
    await redeploy('TaskExecutor');
    await redeploy('UnwrapEth');
    await redeploy('PullToken');
    await redeploy('SumInputs');
    await redeploy('SubInputs');
    await redeploy('SendToken');
    await redeploy('UniswapWrapperV3');
    await redeploy('ChangeProxyOwner');
};

const utilsActionsFullTest = async () => {
    await deployUtilsActionsContracts();
    await wrapEthTest();
    await unwrapEthTest();
    await sumInputsTest();
    await subInputsTest();
    await sendTokenTest();
    await pullTokenTest();
    await changeOwnerTest();
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
};
