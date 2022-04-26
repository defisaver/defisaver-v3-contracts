const { expect } = require('chai');
const hre = require('hardhat');

const dfs = require('@defisaver/sdk');

const {
    impersonateAccount,
    stopImpersonatingAccount,
    getNameId,
    redeploy,
    getAddrFromRegistry,
    openStrategyAndBundleStorage,
    redeployCore,
    getProxy,
    getOwnerAddr,
    timeTravel,
    balanceOf,
    depositToWeth,
    approve,
    placeHolderAddr,
    nullAddress,
    OWNER_ACC,
    REGISTRY_ADDR,
    WETH_ADDRESS,
} = require('../utils');

const { deployContract } = require('../../scripts/utils/deployer');
const {
    getLatestStrategyId,
    addBotCaller,
    subToStrategy,
    createStrategy,
    getSubHash,
} = require('../utils-strategies');

const THREE_HOURS = 3 * 60 * 60;
const TWO_DAYS = 48 * 60 * 60;

const abiCoder = new hre.ethers.utils.AbiCoder();
const pullAmount = '1000000000000';

const addPlaceholderStrategy = async (proxy, maxGasPrice) => {
    const dummyStrategy = new dfs.Strategy('PullTokensStrategy');

    dummyStrategy.addSubSlot('&amount', 'uint256');

    const pullTokenAction = new dfs.actions.basic.PullTokenAction(
        WETH_ADDRESS, '&eoa', '&amount',
    );

    dummyStrategy.addTrigger((new dfs.triggers.GasPriceTrigger(0)));
    dummyStrategy.addAction(pullTokenAction);

    const callData = dummyStrategy.encodeForDsProxyCall();

    const strategyId = await createStrategy(proxy, ...callData, false);

    const amountEncoded = abiCoder.encode(['uint256'], [pullAmount]);

    const triggerData = abiCoder.encode(['uint256'], [maxGasPrice]);
    const strategySub = [strategyId, false, [triggerData], [amountEncoded]];

    const subId = await subToStrategy(proxy, strategySub);

    return { strategySub, subId, strategyId };
};

const dfsRegistryTest = async () => {
    describe('DFS-Registry', function () {
        let registry; let senderAcc2; let owner; let
            registryByOwner;

        const contractAddr1 = '0x00000000219ab540356cBB839Cbe05303d7705Fa';
        const contractAddr2 = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
        const contractAddr3 = '0x71C8dc1d6315a48850E88530d18d3a97505d2065';

        const id1 = getNameId('Contract1');
        const id2 = getNameId('Contract2');
        const id3 = getNameId('Contract3');

        before(async () => {
            this.timeout(40000);

            senderAcc2 = (await hre.ethers.getSigners())[1];
            registry = await deployContract('DFSRegistry');

            owner = await hre.ethers.provider.getSigner(OWNER_ACC);

            registryByOwner = registry.connect(owner);
        });

        describe('Testing auth of the functions', async () => {
            it('...should fail to registry if not owner', async () => {
                const registry2 = registry.connect(senderAcc2);

                try {
                    await registry2.addNewContract(id1, contractAddr1, 0);
                } catch (err) {
                    expect(err.toString()).to.have.string('SenderNotOwner');
                }
            });

            it('...should fail to start contact change if not owner', async () => {
                const registry2 = registry.connect(senderAcc2);

                try {
                    await registry2.startContractChange(id1, contractAddr1);
                } catch (err) {
                    expect(err.toString()).to.have.string('SenderNotOwner');
                }
            });

            it('...should fail to approve contact change if not owner', async () => {
                const registry2 = registry.connect(senderAcc2);

                try {
                    await registry2.approveContractChange(id1);
                } catch (err) {
                    expect(err.toString()).to.have.string('SenderNotOwner');
                }
            });

            it('...should fail to cancel contact change if not owner', async () => {
                const registry2 = registry.connect(senderAcc2);

                try {
                    await registry2.cancelContractChange(id1);
                } catch (err) {
                    expect(err.toString()).to.have.string('SenderNotOwner');
                }
            });
        });

        describe('Testing registry with 0 wait time', async () => {
            it('...should register a new contract with 0 wait time', async () => {
                await impersonateAccount(OWNER_ACC);

                // eslint-disable-next-line no-shadow
                const registryByOwner = registry.connect(owner);
                await registryByOwner.addNewContract(id1, contractAddr1, 0);

                const addr = await registry.getAddr(id1);
                expect(addr).to.be.eq(contractAddr1);
            });

            it('...should initiate a change for 0 wait time entry', async () => {
                // eslint-disable-next-line no-shadow
                const registryByOwner = registry.connect(owner);

                await registryByOwner.startContractChange(id1, contractAddr1);
                await registryByOwner.approveContractChange(id1);

                const addr = await registry.getAddr(id1);
                expect(addr).to.be.eq(contractAddr1);
            });

            it('...should fail to register same id twice', async () => {
                try {
                    // eslint-disable-next-line no-shadow
                    const registryByOwner = registry.connect(owner);
                    await registryByOwner.addNewContract(id1, contractAddr2, 0);
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.false;
                } catch (err) {
                    expect(err.toString()).to.have.string('EntryAlreadyExistsError');
                }

                await stopImpersonatingAccount(OWNER_ACC);
            });
        });

        describe('Testing approval after time has passed', async () => {
            it('...should register a new contract with 3 hours wait time', async () => {
                await impersonateAccount(OWNER_ACC);

                await registryByOwner.addNewContract(id2, contractAddr2, THREE_HOURS);

                const addr = await registry.getAddr(id2);
                expect(addr).to.be.eq(contractAddr2);
            });

            it('...should fail to approve it, because not in change process', async () => {
                try {
                    await registryByOwner.approveContractChange(id2);
                } catch (err) {
                    expect(err.toString()).to.have.string('EntryNotInChangeError');
                }
            });

            it('...should initiate a change and approve after 3 hours', async () => {
                await registryByOwner.startContractChange(id2, contractAddr3);

                await hre.network.provider.request({
                    method: 'evm_increaseTime',
                    params: [THREE_HOURS],
                    id: new Date().getTime(),
                });

                await registryByOwner.approveContractChange(id2);

                const addr = await registry.getAddr(id2);
                expect(addr).to.be.eq(contractAddr3);
            });

            it('...should register a new contract with 2 days wait time', async () => {
                await registryByOwner.addNewContract(id3, contractAddr3, TWO_DAYS);

                const addr = await registry.getAddr(id3);
                expect(addr).to.be.eq(contractAddr3);
            });

            it('...should fail to approve change after one day', async () => {
                await registryByOwner.startContractChange(id3, contractAddr2);

                await hre.network.provider.request({
                    method: 'evm_increaseTime',
                    params: [TWO_DAYS / 2],
                    id: new Date().getTime(),
                });

                try {
                    await registryByOwner.approveContractChange(id3);
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.false;
                } catch (err) {
                    expect(err.toString()).to.have.string('ChangeNotReadyError');
                }
            });

            it('...should cancel the contract change', async () => {
                await registryByOwner.cancelContractChange(id3);

                const entry = await registryByOwner.entries(id3);
                // eslint-disable-next-line no-unused-expressions
                expect(entry.inContractChange).to.be.false;
            });
        });

        describe('Change vote period', async () => {
            it('...should start a change in voting period and approve after 4 days', async () => {
                const newWaitPeriod = TWO_DAYS + TWO_DAYS;
                await registryByOwner.startWaitPeriodChange(id3, newWaitPeriod);

                await hre.network.provider.request({
                    method: 'evm_increaseTime',
                    params: [newWaitPeriod],
                    id: new Date().getTime(),
                });

                await registryByOwner.approveWaitPeriodChange(id3);

                const entry = await registryByOwner.entries(id3);
                expect(entry.waitPeriod).to.be.eq(newWaitPeriod);
            });

            it('...should fail to start a change in contract address, while wait period change', async () => {
                try {
                    const newWaitPeriod = TWO_DAYS + TWO_DAYS;
                    await registryByOwner.startWaitPeriodChange(id3, newWaitPeriod);

                    await registryByOwner.startContractChange(id3, contractAddr3);
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.false;
                } catch (err) {
                    expect(err.toString()).to.have.string('AlreadyInWaitPeriodChangeError');
                    await registryByOwner.cancelWaitPeriodChange(id3);
                }
            });

            it('...should fail to start a wait period change, while in contract change', async () => {
                try {
                    const newWaitPeriod = TWO_DAYS + TWO_DAYS;
                    await registryByOwner.startContractChange(id3, contractAddr3);

                    await registryByOwner.startWaitPeriodChange(id3, newWaitPeriod);
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.false;
                } catch (err) {
                    expect(err.toString()).to.have.string('AlreadyInContractChangeError');
                    await registryByOwner.cancelContractChange(id3);
                }
            });

            it('...should fail to approve voting period change, because not enought time has passed', async () => {
                const newWaitPeriod = TWO_DAYS + TWO_DAYS;
                await registryByOwner.startWaitPeriodChange(id3, newWaitPeriod);

                await hre.network.provider.request({
                    method: 'evm_increaseTime',
                    params: [TWO_DAYS],
                    id: new Date().getTime(),
                });

                try {
                    await registryByOwner.approveWaitPeriodChange(id3);
                    // eslint-disable-next-line no-unused-expressions
                    expect(true).to.be.false;
                } catch (err) {
                    expect(err.toString()).to.have.string('ChangeNotReadyError');
                }
            });

            it('...should start a new period change and cancel it', async () => {
                const newWaitPeriod = TWO_DAYS + TWO_DAYS;
                await registryByOwner.startWaitPeriodChange(id3, newWaitPeriod);

                await registryByOwner.cancelWaitPeriodChange(id3);

                const entry = await registryByOwner.entries(id3);
                // eslint-disable-next-line no-unused-expressions
                expect(entry.inWaitPeriodChange).to.be.false;

                await stopImpersonatingAccount(OWNER_ACC);
            });
        });
    });
};

const botAuthTest = async () => {
    describe('BotAuth', () => {
        let botAuth; let owner; let senderAcc; let botAcc1; let botAcc2;

        before(async () => {
            botAuth = await redeploy('BotAuth');

            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc1 = (await hre.ethers.getSigners())[1];
            botAcc2 = (await hre.ethers.getSigners())[2];

            owner = await hre.ethers.provider.getSigner(OWNER_ACC);
        });

        it('...should add a 2 new accounts to botAuth', async () => {
            await impersonateAccount(OWNER_ACC);
            botAuth = botAuth.connect(owner);

            await botAuth.addCaller(botAcc1.address);
            await botAuth.addCaller(botAcc2.address);

            const bot1Approval = await botAuth.approvedCallers(botAcc1.address);
            const bot2Approval = await botAuth.approvedCallers(botAcc2.address);

            expect(bot1Approval).to.be.eq(true);
            expect(bot2Approval).to.be.eq(true);
        });

        it('...should remove auth from account', async () => {
            await botAuth.removeCaller(botAcc1.address);

            const bot1Approval = await botAuth.approvedCallers(botAcc1.address);
            const bot2Approval = await botAuth.approvedCallers(botAcc2.address);

            expect(bot1Approval).to.be.eq(false);
            expect(bot2Approval).to.be.eq(true);

            await stopImpersonatingAccount(OWNER_ACC);
        });

        it('...should fail to add new acc. because sender not owner', async () => {
            try {
                botAuth = botAuth.connect(senderAcc);
                await botAuth.addCaller(botAcc1.address);
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('SenderNotOwner()');
            }
        });

        it('...should fail to remove new acc. because sender not owner', async () => {
            try {
                await botAuth.removeCaller(botAcc1.address);
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('SenderNotOwner()');
            }
        });
    });
};

const bundleStorageTest = async () => {
    describe('Bundle Storage', () => {
        let bundleStorage;
        let strategyStorage;
        let owner;
        let bundleStorageFromOwner;
        let senderAcc;
        let strategyCount;

        before(async () => {
            await redeployCore();
            const strategyStorageAddr = await getAddrFromRegistry('StrategyStorage');
            strategyStorage = await hre.ethers.getContractAt('StrategyStorage', strategyStorageAddr);

            bundleStorage = await redeploy('BundleStorage');

            senderAcc = (await hre.ethers.getSigners())[0];

            await openStrategyAndBundleStorage();

            // create some dummy strategies
            await strategyStorage.createStrategy('TestStrategy', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
            await strategyStorage.createStrategy('TestStrategy1', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
            await strategyStorage.createStrategy('TestStrategy2', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
            await strategyStorage.createStrategy('TestStrategy3', ['0x11223344', '0x66223344'], ['0x44556677'], [[0, 1, 2]], true);
            await strategyStorage.createStrategy('TestStrategy4', ['0x11223344', '0x55223344'], ['0x44556677'], [[0, 1, 2]], true);

            strategyCount = parseInt((await getLatestStrategyId()), 10);

            owner = await hre.ethers.provider.getSigner(OWNER_ACC);
        });

        it('...should registry a new bundle ', async () => {
            await bundleStorage.createBundle([
                strategyCount - 4,
                strategyCount - 3,
                strategyCount - 2,
            ]);

            const numBundles = await bundleStorage.getBundleCount();

            expect(numBundles).to.be.eq(1);
        });

        it('...should switch open to public to false', async () => {
            await impersonateAccount(OWNER_ACC);

            bundleStorageFromOwner = bundleStorage.connect(owner);

            await bundleStorageFromOwner.changeEditPermission(false);

            await stopImpersonatingAccount(OWNER_ACC);
        });

        it('...should fail to change edit permission from non owner acc', async () => {
            try {
                await bundleStorage.changeEditPermission(false);
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('SenderNotOwner()');
            }
        });

        it('...should fail to reg. a new bundle from non owner acc', async () => {
            try {
                await bundleStorage.createBundle([
                    strategyCount - 4,
                    strategyCount - 3,
                    strategyCount - 2,
                ]);
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('NoAuthToCreateBundle');
            }
        });

        it('...should fail to registry a bundle because triggerIds are not the same', async () => {
            try {
                // set permission to open to test trigger validation
                await openStrategyAndBundleStorage();

                await bundleStorage.createBundle([strategyCount - 2, strategyCount - 1]);
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('DiffTriggersInBundle');
            }
        });

        it('...should fail to registry a bundle because triggerIds are diff. length', async () => {
            try {
                await bundleStorage.createBundle([strategyCount - 2, strategyCount - 1]);
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('DiffTriggersInBundle');
            }

            // set permission to only owner after trigger validation tested
            await impersonateAccount(OWNER_ACC);
            bundleStorageFromOwner = bundleStorage.connect(owner);
            await bundleStorageFromOwner.changeEditPermission(false);
            await stopImpersonatingAccount(OWNER_ACC);
        });

        it('...should reg. bundles from owner acc', async () => {
            await impersonateAccount(OWNER_ACC);

            const numBundlesBefore = await bundleStorageFromOwner.getBundleCount();

            await bundleStorageFromOwner.createBundle([
                strategyCount - 4,
                strategyCount - 3,
                strategyCount - 2,
            ]);
            await bundleStorageFromOwner.createBundle([strategyCount - 2, strategyCount - 3]);
            await bundleStorageFromOwner.createBundle([strategyCount - 3, strategyCount - 2]);

            await stopImpersonatingAccount(OWNER_ACC);

            const numBundles = await bundleStorageFromOwner.getBundleCount();

            expect(numBundles, 10).to.be.eq(parseInt(numBundlesBefore, 10) + 3);
        });

        // view testing

        it('...should fetch a bundle by id', async () => {
            const bundleData = await bundleStorage.getBundle(0);

            expect(bundleData.creator).to.be.eq(senderAcc.address);
            const ids = bundleData.strategyIds.map((id) => parseInt(id, 10));

            expect(ids).to.be.eql([
                strategyCount - 4,
                strategyCount - 3,
                strategyCount - 2]);
        });

        it('...should fetch strategy id from a bundle', async () => {
            const strategyId = await bundleStorage.getStrategyId(
                2,
                1,
            );

            expect(strategyId.toString()).to.be.eql((strategyCount - 3).toString());
        });

        it('...should fetch getPaginatedBundles', async () => {
            const bundles1 = await bundleStorageFromOwner.getPaginatedBundles(0, 2);

            expect(bundles1[0].creator).to.be.eq(senderAcc.address);
            expect(bundles1[1].creator).to.be.eq(OWNER_ACC);

            const bundles2 = await bundleStorageFromOwner.getPaginatedBundles(1, 2);

            expect(bundles2[0].creator).to.be.eq(OWNER_ACC);
            expect(bundles2[1].creator).to.be.eq(OWNER_ACC);
        });
    });
};

const proxyAuthTest = async () => {
    describe('ProxyAuth', () => {
        let proxyAuth; let proxy; let proxy2; let senderAcc; let proxyPermission; let sumInputs;

        before(async () => {
            proxyAuth = await redeploy('ProxyAuth');
            sumInputs = await redeploy('SumInputs');

            senderAcc = (await hre.ethers.getSigners())[0];
            const senderAcc2 = (await hre.ethers.getSigners())[1];

            proxy = await getProxy(senderAcc.address);
            proxy2 = await getProxy(senderAcc2.address);

            // give auth to ProxyAuth
            proxyPermission = await redeploy('ProxyPermission');

            // set StrategyExecutor to EOA for testing purposes so we can callExecute()

            await impersonateAccount(getOwnerAddr());
            const signer = await hre.ethers.provider.getSigner(getOwnerAddr());

            const registryInstance = await hre.ethers.getContractFactory('DFSRegistry', signer);
            let registry = await registryInstance.attach(REGISTRY_ADDR);

            registry = registry.connect(signer);

            const id = getNameId('StrategyExecutorID');

            await registry.startContractChange(id, senderAcc.address, { gasLimit: 2000000 });

            const entryData = await registry.entries(id);

            if (parseInt(entryData.waitPeriod, 10) > 0) {
                await timeTravel(parseInt(entryData.waitPeriod, 10) + 10);
            }

            await registry.approveContractChange(id, { gasLimit: 2000000 });

            await stopImpersonatingAccount(getOwnerAddr());
        });

        it('...should callExecute when auth is given to proxyAuth and StrategyExecutor set', async () => {
            // give proxy permission to ProxyAuth
            const ProxyPermission = await hre.ethers.getContractFactory('ProxyPermission');
            const functionData = ProxyPermission.interface.encodeFunctionData(
                'givePermission',
                [proxyAuth.address],
            );

            await proxy['execute(address,bytes)'](proxyPermission.address, functionData, { gasLimit: 1500000 });

            // test action
            const encodedCall = new dfs.actions.basic.SumInputsAction(1, 2).encodeForDsProxyCall();

            try {
                await proxyAuth.callExecute(proxy.address, sumInputs.address, encodedCall[1]);
                expect(true).to.be.equal(true);
            } catch (err) {
                expect(true).to.be.equal(false);
            }
        });

        it('...should fail when ProxyAuth has no DSProxy.authority()', async () => {
            try {
                // eslint-disable-next-line max-len
                const encodedCall = (new dfs.actions.basic.SumInputsAction(1, 2)).encodeForDsProxyCall();

                await proxyAuth.callExecute(proxy2.address, sumInputs.address, encodedCall[1]);
                expect(true).to.be.equal(false);
            } catch (err) {
                // can't map error as the DSProxy throws
                expect(true).to.be.equal(true);
            }
        });

        it('...should fail when StrategyExecutor is not the caller', async () => {
            try {
                await redeploy('StrategyExecutor'); // set diff. address to be StrategyExecutor

                // eslint-disable-next-line max-len
                const encodedCall = (new dfs.actions.basic.SumInputsAction(1, 2)).encodeForDsProxyCall();

                await proxyAuth.callExecute(proxy.address, sumInputs.address, encodedCall[1]);
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('SenderNotExecutorError');
            }
        });
    });
};

const recipeExecutorTest = async () => {
    describe('RecipeExecutor', () => {
        let proxy;
        let strategyExecutor;
        let senderAcc;
        let botAcc;
        let strategySub;
        let actionData;
        let triggerData;
        let subProxy;
        let strategyExecutorByBot;
        let maxGasPrice;
        let recipeExecutor;
        let dydxFl;
        let strategyId;
        let subId;

        before(async () => {
            strategyExecutor = await redeployCore();

            const recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');
            recipeExecutor = await hre.ethers.getContractAt('RecipeExecutor', recipeExecutorAddr);

            const subProxyAddr = await getAddrFromRegistry('SubProxy');
            subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

            dydxFl = await redeploy('FLDyDx');
            await redeploy('SendToken');
            await redeploy('WrapEth');
            await redeploy('GasPriceTrigger');

            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            proxy = await getProxy(senderAcc.address);

            maxGasPrice = '0';

            await openStrategyAndBundleStorage();

            ({ strategySub, strategyId, subId } = await addPlaceholderStrategy(proxy, maxGasPrice));

            const pullTokenAction = new dfs.actions.basic.PullTokenAction(
                WETH_ADDRESS, placeHolderAddr, 0,
            );

            actionData = pullTokenAction.encodeForRecipe()[0];
            triggerData = abiCoder.encode(['uint256'], [0]);

            await addBotCaller(botAcc.address);
        });

        it('...should fail to execute recipe by strategy because the triggers check is not passing', async () => {
            try {
                await strategyExecutorByBot.executeStrategy(
                    subId,
                    0,
                    [triggerData],
                    [actionData],
                    strategySub,
                    { gasLimit: 5000000 },
                );
                expect(true).to.be.equal(false);
            } catch (err) {
                // trigger error not caught by hardhat but it is throwing it
                // expect(err.toString()).to.have.string('TriggerNotActiveError');
                expect(err.toString()).to.have.string('reverted without a reason string');
            }
        });

        it('...should execute recipe by strategy', async () => {
            // update sub data so trigger will pass
            const amountEncoded = abiCoder.encode(['uint256'], [pullAmount]);
            maxGasPrice = '1000000000000';
            triggerData = abiCoder.encode(['uint256'], [maxGasPrice]);
            strategySub = [strategyId, false, [triggerData], [amountEncoded]];

            const functionData = subProxy.interface.encodeFunctionData('updateSubData',
                [subId, [strategyId, false, [triggerData], [amountEncoded]]]);

            await proxy['execute(address,bytes)'](subProxy.address, functionData, {
                gasLimit: 5000000,
            });

            // deposit weth and give allowance to dsproxy for pull action
            await depositToWeth(pullAmount);
            await approve(WETH_ADDRESS, proxy.address);

            const beforeBalance = await balanceOf(WETH_ADDRESS, proxy.address);

            await strategyExecutorByBot.executeStrategy(
                subId,
                0,
                [triggerData],
                [actionData],
                strategySub,
                { gasLimit: 5000000 },
            );

            const afterBalance = await balanceOf(WETH_ADDRESS, proxy.address);

            expect(beforeBalance.add(pullAmount)).to.be.eq(afterBalance);
        });

        it('...should execute basic placeholder recipe', async () => {
            const beforeBalance = await balanceOf(WETH_ADDRESS, senderAcc.address);

            const dummyRecipe = new dfs.Recipe('DummyRecipe', [
                new dfs.actions.basic.WrapEthAction(pullAmount),
                new dfs.actions.basic.SendTokenAction(WETH_ADDRESS, senderAcc.address, pullAmount),
            ]);

            const functionData = dummyRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](recipeExecutor.address, functionData[1], {
                gasLimit: 3000000,
                value: pullAmount,
            });

            const afterBalance = await balanceOf(WETH_ADDRESS, senderAcc.address);

            expect(beforeBalance.add(pullAmount)).to.be.eq(afterBalance);
        });

        it('...should execute basic recipe with FL', async () => {
            const beforeBalance = await balanceOf(WETH_ADDRESS, senderAcc.address);

            const dummyRecipeWithFL = new dfs.Recipe('DummyRecipeWithFl', [
                // eslint-disable-next-line max-len
                new dfs.actions.flashloan.DyDxFlashLoanAction(pullAmount, WETH_ADDRESS, nullAddress, []),
                new dfs.actions.basic.SendTokenAction(WETH_ADDRESS, dydxFl.address, pullAmount),
            ]);

            const functionData = dummyRecipeWithFL.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](recipeExecutor.address, functionData[1], {
                gasLimit: 3000000,
            });

            const afterBalance = await balanceOf(WETH_ADDRESS, senderAcc.address);

            expect(beforeBalance).to.be.eq(afterBalance);
        });
    });
};

const strategyExecutorTest = async () => {
    describe('StrategyExecutor', () => {
        let proxy;
        let strategyExecutor;
        let senderAcc;
        let botAcc;
        let strategySub;
        let actionData;
        let triggerData;
        let subProxy;
        let strategyExecutorByBot;
        let strategyId;
        let subId;

        before(async () => {
            strategyExecutor = await redeployCore();

            const subProxyAddr = await getAddrFromRegistry('SubProxy');
            subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

            await redeploy('SendToken');
            await redeploy('WrapEth');
            await redeploy('GasPriceTrigger');

            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];

            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            proxy = await getProxy(senderAcc.address);

            const maxGasPrice = '1000000000000';

            await openStrategyAndBundleStorage();

            ({ strategySub, strategyId, subId } = await addPlaceholderStrategy(proxy, maxGasPrice));

            const pullTokenAction = new dfs.actions.basic.PullTokenAction(
                WETH_ADDRESS, placeHolderAddr, 0,
            );

            actionData = pullTokenAction.encodeForRecipe()[0];
            triggerData = abiCoder.encode(['uint256'], [maxGasPrice]);
        });

        it('...should fail because caller is not auth bot', async () => {
            try {
                await strategyExecutor.executeStrategy(
                    subId,
                    0,
                    [triggerData],
                    [actionData],
                    strategySub,
                );
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('BotNotApproved');
            }
        });

        it('...should fail because of wrong SubData hash', async () => {
            try {
                await addBotCaller(botAcc.address);

                const amountEncoded = abiCoder.encode(['uint256'], [pullAmount]);
                // isBundle changed to true
                const strategySubUpdated = [strategyId, true, [triggerData], [amountEncoded]];

                await strategyExecutorByBot.executeStrategy(
                    subId,
                    0,
                    [triggerData],
                    [actionData],
                    strategySubUpdated,
                );
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('SubDatHashMismatch');
            }
        });

        it('...should fail because subscription is not enabled', async () => {
            try {
                // disable sub
                const functionData = subProxy.interface.encodeFunctionData('deactivateSub', [subId]);
                await proxy['execute(address,bytes)'](subProxy.address, functionData, {
                    gasLimit: 5000000,
                });

                await strategyExecutorByBot.executeStrategy(
                    subId,
                    0,
                    [triggerData],
                    [actionData],
                    strategySub,
                );
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('SubNotEnabled(');
            }

            // enable sub
            const functionData = subProxy.interface.encodeFunctionData('activateSub', [subId]);
            await proxy['execute(address,bytes)'](subProxy.address, functionData, {
                gasLimit: 5000000,
            });
        });

        it('...should execute the placeholder strategies once all conditions are met', async () => {
            // deposit weth and give allowance to dsproxy for pull action
            await depositToWeth(pullAmount);
            await approve(WETH_ADDRESS, proxy.address);

            const beforeBalance = await balanceOf(WETH_ADDRESS, proxy.address);

            await strategyExecutorByBot.executeStrategy(
                subId,
                0,
                [triggerData],
                [actionData],
                strategySub,
                { gasLimit: 5000000 },
            );

            const afterBalance = await balanceOf(WETH_ADDRESS, proxy.address);

            expect(beforeBalance.add(pullAmount)).to.be.eq(afterBalance);
        });
    });
};

const strategyProxyTest = async () => {
    describe('StrategyProxy', () => {
        let strategyStorage;
        let bundleStorage;
        let senderAcc;
        let strategyProxy;
        let proxy;

        before(async () => {
            await redeployCore();

            const strategyStorageAddr = await getAddrFromRegistry('StrategyStorage');
            strategyStorage = await hre.ethers.getContractAt('StrategyStorage', strategyStorageAddr);

            const bundleStorageAddr = await getAddrFromRegistry('BundleStorage');
            bundleStorage = await hre.ethers.getContractAt('BundleStorage', bundleStorageAddr);

            const strategyProxyAddr = await getAddrFromRegistry('StrategyProxy');
            strategyProxy = await hre.ethers.getContractAt('StrategyProxy', strategyProxyAddr);

            senderAcc = (await hre.ethers.getSigners())[0];

            await openStrategyAndBundleStorage();

            proxy = await getProxy(senderAcc.address);
        });

        it('...should create a new strategy ', async () => {
            const numStrategiesBefore = await strategyStorage.getStrategyCount();

            const functionData = strategyProxy.interface.encodeFunctionData('createStrategy', [
                'TestStrategy', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true,
            ]);

            await proxy['execute(address,bytes)'](strategyProxy.address, functionData, {
                gasLimit: 5000000,
            });

            const numStrategies = await strategyStorage.getStrategyCount();

            expect(numStrategies).to.be.eq(+numStrategiesBefore + 1);
        });

        it('...should create a another new strategy ', async () => {
            const numStrategiesBefore = await strategyStorage.getStrategyCount();

            const functionData = strategyProxy.interface.encodeFunctionData('createStrategy', [
                'TestStrategy2', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true,
            ]);

            await proxy['execute(address,bytes)'](strategyProxy.address, functionData, {
                gasLimit: 5000000,
            });

            const numStrategies = await strategyStorage.getStrategyCount();

            expect(numStrategies).to.be.eq(+numStrategiesBefore + 1);
        });

        it('...should registry a new bundle ', async () => {
            const numBundlesBefore = await bundleStorage.getBundleCount();

            const numStrategies = +(await strategyStorage.getStrategyCount()) - 1;

            console.log(numStrategies);
            const functionData = strategyProxy.interface.encodeFunctionData('createBundle', [
                [numStrategies, numStrategies - 1],
            ]);

            await proxy['execute(address,bytes)'](strategyProxy.address, functionData, {
                gasLimit: 5000000,
            });

            const numBundles = await bundleStorage.getBundleCount();

            expect(numBundles).to.be.eq(+numBundlesBefore + 1);
        });
    });
};

const strategyStorageTest = async () => {
    describe('StrategyStorage', () => {
        let strategyStorage; let owner; let strategyStorageFromOwner;

        before(async () => {
            const strategyStorageAddr = await getAddrFromRegistry('StrategyStorage');
            strategyStorage = await hre.ethers.getContractAt('StrategyStorage', strategyStorageAddr);

            await openStrategyAndBundleStorage();

            owner = await hre.ethers.provider.getSigner(OWNER_ACC);
        });

        it('...should registry a new strategy ', async () => {
            const numStrategiesBefore = await strategyStorage.getStrategyCount();

            await strategyStorage.createStrategy('TestStrategy', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);

            const numStrategies = await strategyStorage.getStrategyCount();

            expect(numStrategies).to.be.eq(+numStrategiesBefore + 1);
        });

        it('...should switch open to public to false', async () => {
            await impersonateAccount(OWNER_ACC);

            strategyStorageFromOwner = strategyStorage.connect(owner);

            await strategyStorageFromOwner.changeEditPermission(false);

            await stopImpersonatingAccount(OWNER_ACC);
        });

        it('...should fail to change edit permission from non owner acc', async () => {
            try {
                await strategyStorage.changeEditPermission(false);
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('SenderNotOwner()');
            }
        });

        it('...should fail to reg. a new strategy from non owner acc', async () => {
            try {
                await strategyStorage.createStrategy('TestStrategy', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('NoAuthToCreateStrategy');
            }
        });

        it('...should reg. strategies from owner acc', async () => {
            await impersonateAccount(OWNER_ACC);

            const numStrategiesBefore = await strategyStorage.getStrategyCount();

            await strategyStorageFromOwner.createStrategy('TestStrategy2', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
            await strategyStorageFromOwner.createStrategy('TestStrategy3', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
            await strategyStorageFromOwner.createStrategy('TestStrategy4', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);

            await stopImpersonatingAccount(OWNER_ACC);

            const numStrategies = await strategyStorageFromOwner.getStrategyCount();

            expect(numStrategies).to.be.eq(+numStrategiesBefore + 3);
        });

        // view testing

        it('...should fetch a strategy by id', async () => {
            const numStrategies = await strategyStorage.getStrategyCount();

            const strategyData = await strategyStorage.getStrategy(+numStrategies - 1);

            expect(strategyData.creator).to.be.eq(OWNER_ACC);
            expect(strategyData.name).to.be.eq('TestStrategy4');
        });

        it('...should fetch getPaginatedStrategies', async () => {
            const strategies1 = await strategyStorageFromOwner.getPaginatedStrategies(
                0,
                2,
            );

            expect(strategies1[0].name).to.be.eq('McdYearnRepayStrategy');
            expect(strategies1[1].name).to.be.eq('McdYearnRepayWithExchangeStrategy');

            const strategies2 = await strategyStorageFromOwner.getPaginatedStrategies(
                2,
                2,
            );

            expect(strategies2[0].name).to.be.eq('McdRariRepayStrategy');
            expect(strategies2[1].name).to.be.eq('McdRariRepayWithExchangeStrategy');
        });
    });
};

const subProxyTest = async () => {
// this just a proxy contract implementation already tested in SubStore (so just basic tests)
    describe('SubProxy', () => {
        let subProxy;
        let senderAcc;
        let strategyStorage;
        let subStorage;
        let proxy;

        before(async () => {
            const subStorageAddr = await getAddrFromRegistry('SubStorage');
            subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

            const subProxyAddr = await getAddrFromRegistry('SubProxy');
            subProxy = await hre.ethers.getContractAt('SubProxy', subProxyAddr);

            const strategyStorageAddr = await getAddrFromRegistry('StrategyStorage');
            strategyStorage = await hre.ethers.getContractAt('StrategyStorage', strategyStorageAddr);
            await openStrategyAndBundleStorage();

            await strategyStorage.createStrategy('TestStrategy', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
            await strategyStorage.createStrategy('TestStrategy2', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);

            senderAcc = (await hre.ethers.getSigners())[0];

            proxy = await getProxy(senderAcc.address);
        });

        it('...should add a new subscription', async () => {
            const numStrategies = +(await strategyStorage.getStrategyCount()) - 1;

            const subData = [numStrategies, false, [], []];
            const subDataHash = getSubHash(subData);

            const functionData = subProxy.interface.encodeFunctionData('subscribeToStrategy', [subData]);

            const numSubsBefore = await subStorage.getSubsCount();

            await proxy['execute(address,bytes)'](subProxy.address, functionData, {
                gasLimit: 5000000,
            });

            const latestSub = await subStorage.getSubsCount();

            expect(latestSub).to.be.eq(+numSubsBefore + 1);
            const storedSub = await subStorage.getSub(latestSub - 1);
            expect(storedSub.strategySubHash).to.be.eq(subDataHash);
        });

        it('...should update the new subscription', async () => {
            const numStrategies = +(await strategyStorage.getStrategyCount()) - 1;
            const latestSub = +(await subStorage.getSubsCount()) - 1;

            const updatedSubData = [numStrategies - 1, false, [], []];

            const subDataHash = getSubHash(updatedSubData);

            const functionData = subProxy.interface.encodeFunctionData('updateSubData', [latestSub, updatedSubData]);

            await proxy['execute(address,bytes)'](subProxy.address, functionData, {
                gasLimit: 5000000,
            });

            const storedSub = await subStorage.getSub(latestSub);
            expect(storedSub.strategySubHash).to.be.eq(subDataHash);
        });

        it('...should deactivate users sub', async () => {
            const latestSub = +(await subStorage.getSubsCount()) - 1;

            const functionData = subProxy.interface.encodeFunctionData('deactivateSub', [latestSub]);

            await proxy['execute(address,bytes)'](subProxy.address, functionData, {
                gasLimit: 5000000,
            });

            const storedSub = await subStorage.getSub(latestSub);
            expect(storedSub.isEnabled).to.be.eq(false);
        });

        it('...should activate users sub', async () => {
            const latestSub = +(await subStorage.getSubsCount()) - 1;

            const functionData = subProxy.interface.encodeFunctionData('activateSub', [latestSub]);

            await proxy['execute(address,bytes)'](subProxy.address, functionData, {
                gasLimit: 5000000,
            });

            const storedSub = await subStorage.getSub(latestSub);
            expect(storedSub.isEnabled).to.be.eq(true);
        });
    });
};

const subStorageTest = async () => {
    describe('SubStorage', () => {
        let subStorage; let senderAcc2; let strategyStorage;

        before(async () => {
            const subStorageAddr = await getAddrFromRegistry('SubStorage');
            subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

            const strategyStorageAddr = await getAddrFromRegistry('StrategyStorage');
            strategyStorage = await hre.ethers.getContractAt('StrategyStorage', strategyStorageAddr);

            await openStrategyAndBundleStorage();

            await strategyStorage.createStrategy('TestStrategy', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
            await strategyStorage.createStrategy('TestStrategy2', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);

            senderAcc2 = (await hre.ethers.getSigners())[1];
        });

        it('...should add a new subscription', async () => {
            const numStrategies = +(await strategyStorage.getStrategyCount()) - 1;

            const subData = [numStrategies, false, [], []];
            const subDataHash = getSubHash(subData);

            const numSubsBefore = await subStorage.getSubsCount();

            await subStorage.subscribeToStrategy(subData);

            const latestSub = await subStorage.getSubsCount();

            expect(latestSub).to.be.eq(+numSubsBefore + 1);
            const storedSub = await subStorage.getSub(latestSub - 1);
            expect(storedSub.strategySubHash).to.be.eq(subDataHash);
        });

        it('...should fail to add a new subscription with an invalid subId', async () => {
            try {
                const subData = [42069, false, [], []];

                await subStorage.subscribeToStrategy(subData);
            } catch (err) {
                expect(err.toString()).to.have.string('SubIdOutOfRange');
            }
        });

        it('...should fail to add a new subscription with an invalid bundleId', async () => {
            try {
                const subData = [42069, true, [], []];

                await subStorage.subscribeToStrategy(subData);
            } catch (err) {
                expect(err.toString()).to.have.string('SubIdOutOfRange');
            }
        });

        it('...should update the new subscription', async () => {
            const numStrategies = +(await strategyStorage.getStrategyCount()) - 1;
            const latestSub = +(await subStorage.getSubsCount()) - 1;

            const updatedSubData = [numStrategies - 1, false, [], []];

            const subDataHash = getSubHash(updatedSubData);

            await subStorage.updateSubData(latestSub, updatedSubData);

            const storedSub = await subStorage.getSub(latestSub);
            expect(storedSub.strategySubHash).to.be.eq(subDataHash);
        });

        it('...should fail to update with and invalid subId', async () => {
            try {
                const updatedSubData = [42069, false, [], []];
                const latestSub = +(await subStorage.getSubsCount()) - 1;

                await subStorage.updateSubData(latestSub, updatedSubData);
            } catch (err) {
                expect(err.toString()).to.have.string('SubIdOutOfRange');
            }
        });

        it('...should fail to update with and invalid bundleId', async () => {
            try {
                const updatedSubData = [42069, true, [], []];
                const latestSub = +(await subStorage.getSubsCount()) - 1;

                await subStorage.updateSubData(latestSub, updatedSubData);
            } catch (err) {
                expect(err.toString()).to.have.string('SubIdOutOfRange');
            }
        });

        it('...should fail to update the subscription from non-owner account', async () => {
            try {
                const updatedSubData = [1, false, [], []];
                const subStorageSender2 = subStorage.connect(senderAcc2);

                await subStorageSender2.updateSubData(0, updatedSubData);
            } catch (err) {
                expect(err.toString()).to.have.string('SenderNotSubOwnerError');
            }
        });

        it('...should deactivate users sub', async () => {
            const latestSub = +(await subStorage.getSubsCount()) - 1;

            await subStorage.deactivateSub(latestSub);

            const storedSub = await subStorage.getSub(latestSub);
            expect(storedSub.isEnabled).to.be.eq(false);
        });

        it('...should fail to deactivate users sub from non-owner account', async () => {
            try {
                const subStorageSender2 = subStorage.connect(senderAcc2);

                await subStorageSender2.deactivateSub(0);
            } catch (err) {
                expect(err.toString()).to.have.string('SenderNotSubOwnerError');
            }
        });

        it('...should activate users sub', async () => {
            const latestSub = +(await subStorage.getSubsCount()) - 1;

            await subStorage.activateSub(latestSub);

            const storedSub = await subStorage.getSub(latestSub);
            expect(storedSub.isEnabled).to.be.eq(true);
        });

        it('...should fail to activate users sub from non-owner account', async () => {
            try {
                const latestSub = +(await subStorage.getSubsCount()) - 1;

                const subStorageSender2 = subStorage.connect(senderAcc2);

                await subStorageSender2.activateSub(latestSub);
            } catch (err) {
                expect(err.toString()).to.have.string('SenderNotSubOwnerError');
            }
        });
    });
};

const coreFullTest = async () => {
    await strategyProxyTest();
    await dfsRegistryTest();
    await botAuthTest();
    await bundleStorageTest();
    await proxyAuthTest();
    await recipeExecutorTest();
    await strategyExecutorTest();
    await strategyStorageTest();
    await subProxyTest();
    await subStorageTest();
};

module.exports = {
    coreFullTest,
    dfsRegistryTest,
    bundleStorageTest,
    botAuthTest,
    proxyAuthTest,
    recipeExecutorTest,
    strategyExecutorTest,
    strategyProxyTest,
    strategyStorageTest,
    subProxyTest,
    subStorageTest,
};
