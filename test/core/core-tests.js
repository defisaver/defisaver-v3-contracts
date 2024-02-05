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
    OWNER_ACC,
    REGISTRY_ADDR,
    WETH_ADDRESS,
    revertToSnapshot,
    takeSnapshot,
    getAdminAddr,
    WALLETS,
    isWalletNameDsProxy,
} = require('../utils');

const { deployContract } = require('../../scripts/utils/deployer');
const {
    getLatestStrategyId,
    addBotCaller,
    subToStrategy,
    createStrategy,
    getSubHash,
} = require('../utils-strategies');
const { executeSafeTx } = require('../utils-safe');
const { CoreAddressesInjector } = require('../addressInjector');

const THREE_HOURS = 3 * 60 * 60;
const TWO_DAYS = 48 * 60 * 60;

const abiCoder = new hre.ethers.utils.AbiCoder();
const pullAmount = '1000000000000';

/**
 * Set StrategyExecutor to EOA for testing purposes so we can callExecute()
 */
const impersonateStrategyExecutorAsEoa = async (senderAddr) => {
    await impersonateAccount(getOwnerAddr());
    const signer = await hre.ethers.provider.getSigner(getOwnerAddr());

    const registryInstance = await hre.ethers.getContractFactory('DFSRegistry', signer);
    let registry = await registryInstance.attach(REGISTRY_ADDR);

    registry = registry.connect(signer);

    const id = getNameId('StrategyExecutorID');

    await registry.startContractChange(id, senderAddr, { gasLimit: 2000000 });

    const entryData = await registry.entries(id);

    if (parseInt(entryData.waitPeriod, 10) > 0) {
        await timeTravel(parseInt(entryData.waitPeriod, 10) + 10);
    }

    await registry.approveContractChange(id, { gasLimit: 2000000 });

    await stopImpersonatingAccount(getOwnerAddr());
};

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
        let proxyAuth; let proxy; let proxy2; let senderAcc; let dsProxyPermission; let sumInputs;

        before(async () => {
            proxyAuth = await redeploy('ProxyAuth');
            sumInputs = await redeploy('SumInputs');

            senderAcc = (await hre.ethers.getSigners())[0];
            const senderAcc2 = (await hre.ethers.getSigners())[1];

            proxy = await getProxy(senderAcc.address);
            proxy2 = await getProxy(senderAcc2.address);

            // give auth to ProxyAuth
            dsProxyPermission = await redeploy('DSProxyPermission');

            await impersonateStrategyExecutorAsEoa(senderAcc.address);
        });

        it('...should callExecute when auth is given to proxyAuth and StrategyExecutor set', async () => {
            // give proxy permission to ProxyAuth
            const DSProxyPermission = await hre.ethers.getContractFactory('DSProxyPermission');
            const functionData = DSProxyPermission.interface.encodeFunctionData(
                'giveProxyPermission',
                [proxyAuth.address],
            );

            await proxy['execute(address,bytes)'](dsProxyPermission.address, functionData, { gasLimit: 1500000 });

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

const safeModuleAuthTest = async () => {
    describe('SafeModuleAuth', () => {
        let safeModuleAuth;
        let safeModulePermission;
        let senderAcc;
        let sumInputs;
        let safe;
        let snapshotId;

        before(async () => {
            safeModuleAuth = await redeploy('SafeModuleAuth');
            safeModulePermission = await redeploy('SafeModulePermission');
            sumInputs = await redeploy('SumInputs');
            senderAcc = (await hre.ethers.getSigners())[0];
            safe = await getProxy(senderAcc.address, true);
            await impersonateStrategyExecutorAsEoa(senderAcc.address);
        });

        beforeEach(async () => { snapshotId = await takeSnapshot(); });
        afterEach(async () => { await revertToSnapshot(snapshotId); });

        it('... should callExecute when auth is given to safeModuleAuth and StrategyExecutor is set', async () => {
            // give safe module permission to SafeModuleAuth
            const SafeModulePermission = await hre.ethers.getContractFactory('SafeModulePermission');
            const functionData = SafeModulePermission.interface.encodeFunctionData(
                'enableModule',
                [safeModuleAuth.address],
            );

            await executeSafeTx(
                senderAcc.address,
                safe,
                safeModulePermission.address,
                functionData,
            );

            // test action
            const encodedCall = new dfs.actions.basic.SumInputsAction(1, 2).encodeForDsProxyCall();

            try {
                await safeModuleAuth.callExecute(safe.address, sumInputs.address, encodedCall[1]);
                expect(true).to.be.equal(true);
            } catch (err) {
                expect(true).to.be.equal(false);
            }
        });

        it('... should fail when safeModuleAuth has no safe module permission', async () => {
            const encodedCall = (new dfs.actions.basic.SumInputsAction(1, 2))
                .encodeForDsProxyCall();

            await expect(
                safeModuleAuth.callExecute(safe.address, sumInputs.address, encodedCall[1]),
            ).to.be.reverted;
        });

        it('... should fail when StrategyExecutor is not the caller', async () => {
            await redeploy('StrategyExecutor'); // set diff. address to be StrategyExecutor

            const encodedCall = (new dfs.actions.basic.SumInputsAction(1, 2))
                .encodeForDsProxyCall();

            await expect(
                safeModuleAuth.callExecute(safe.address, sumInputs.address, encodedCall[1]),
            ).to.be.reverted;
        });

        it('... should fail when safeModuleAuth is paused', async () => {
            const SafeModulePermission = await hre.ethers.getContractFactory('SafeModulePermission');
            const functionData = SafeModulePermission.interface.encodeFunctionData(
                'enableModule',
                [safeModuleAuth.address],
            );
            await executeSafeTx(
                senderAcc.address,
                safe,
                safeModulePermission.address,
                functionData,
            );
            const encodedCall = (new dfs.actions.basic.SumInputsAction(1, 2))
                .encodeForDsProxyCall();

            await impersonateAccount(getAdminAddr());
            const adminAcc = await hre.ethers.provider.getSigner(getAdminAddr());
            const safeModuleAuthByAdmin = safeModuleAuth.connect(adminAcc);
            await safeModuleAuthByAdmin.setPaused(true);

            await expect(
                safeModuleAuth.connect(senderAcc)
                    .callExecute(safe.address, sumInputs.address, encodedCall[1]),
            ).to.be.reverted;
        });
    });
};

const recipeExecutorTest = async () => {
    describe('RecipeExecutor', () => {
        const coreAddressesInjector = new CoreAddressesInjector();
        let snapshotId;

        let actionData;
        let triggerData;
        let subProxy;

        let proxyAuth;
        let safeModuleAuth;
        let dsProxyPermission;
        let safeModulePermission;

        let strategyExecutor;
        let strategyExecutorByBot;
        let recipeExecutor;
        let maxGasPrice;
        let flAddr;

        let senderAcc;
        let botAcc;
        let wallet;
        let dsProxy;
        let safe;
        let useDsProxy;

        const executeTxThroughWallet = async (
            functionData,
            targetAddr,
            ethValue = 0,
            gl = 5000000,
        ) => {
            await (useDsProxy
                ? wallet['execute(address,bytes)'](targetAddr, functionData, { gasLimit: gl, value: ethValue })
                : executeSafeTx(senderAcc.address, wallet, targetAddr, functionData, 1, ethValue));
        };

        const setupWallet = async (w) => {
            if (isWalletNameDsProxy(w)) {
                useDsProxy = true;
                wallet = dsProxy;
            } else {
                useDsProxy = false;
                wallet = safe;
            }
        };

        const giveAuthPermissionsToWallets = async () => {
            // give permission to ProxyAuth
            const DSProxyPermission = await hre.ethers.getContractFactory('DSProxyPermission');
            const functionDataDsProxy = DSProxyPermission.interface.encodeFunctionData(
                'giveProxyPermission',
                [proxyAuth.address],
            );
            await dsProxy['execute(address,bytes)'](dsProxyPermission.address, functionDataDsProxy, { gasLimit: 1500000 });

            // give permission to SafeModuleAuth
            const SafeModulePermission = await hre.ethers.getContractFactory('SafeModulePermission');
            const functionDataSafe = SafeModulePermission.interface.encodeFunctionData(
                'enableModule',
                [safeModuleAuth.address],
            );
            await executeSafeTx(
                senderAcc.address,
                safe,
                safeModulePermission.address,
                functionDataSafe,
            );
        };

        before(async () => {
            recipeExecutor = await redeploy('RecipeExecutor');
            subProxy = await redeploy('SubProxy');
            proxyAuth = await redeploy('ProxyAuth');
            safeModuleAuth = await redeploy('SafeModuleAuth');
            dsProxyPermission = await redeploy('DSProxyPermission');
            safeModulePermission = await redeploy('SafeModulePermission');

            await coreAddressesInjector.inject(
                recipeExecutor.address, proxyAuth.address, safeModuleAuth.address,
            );

            strategyExecutor = await redeploy('StrategyExecutor');

            // redeploy as those are used in recipes examples
            const flActionContract = await redeploy('FLAction');
            flAddr = flActionContract.address;
            await redeploy('PullToken');
            await redeploy('SendToken');

            senderAcc = (await hre.ethers.getSigners())[0];
            botAcc = (await hre.ethers.getSigners())[1];
            strategyExecutorByBot = strategyExecutor.connect(botAcc);

            dsProxy = await getProxy(senderAcc.address);
            safe = await getProxy(senderAcc.address, true);
            maxGasPrice = '0';

            await openStrategyAndBundleStorage();

            const pullTokenAction = new dfs.actions.basic.PullTokenAction(
                WETH_ADDRESS, placeHolderAddr, 0,
            );

            actionData = pullTokenAction.encodeForRecipe()[0];
            triggerData = abiCoder.encode(['uint256'], [0]);

            await addBotCaller(botAcc.address);
            await giveAuthPermissionsToWallets();
        });

        after(async () => {
            await coreAddressesInjector.rollBack();
        });

        beforeEach(async () => { snapshotId = await takeSnapshot(); });
        afterEach(async () => { await revertToSnapshot(snapshotId); });

        for (let i = 0; i < WALLETS.length; i++) {
            it(`...should fail to execute recipe by strategy through ${WALLETS[i]} because the triggers check is not passing`, async () => {
                setupWallet(WALLETS[i]);
                const { strategySub, subId } = await addPlaceholderStrategy(
                    wallet, maxGasPrice,
                );
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
                    if (useDsProxy) {
                        expect(err.toString()).to.have.string('reverted without a reason string');
                    } else {
                        expect(err.toString()).to.have.string('SafeExecutionError');
                    }
                }
            });

            it(`...should execute recipe by strategy through ${WALLETS[i]}`, async () => {
                setupWallet(WALLETS[i]);
                const { strategyId, subId } = await addPlaceholderStrategy(
                    wallet, maxGasPrice,
                );
                // update sub data so trigger will pass
                const amountEncoded = abiCoder.encode(['uint256'], [pullAmount]);
                maxGasPrice = '1000000000000';
                triggerData = abiCoder.encode(['uint256'], [maxGasPrice]);
                const strategySub = [strategyId, false, [triggerData], [amountEncoded]];

                const functionData = subProxy.interface.encodeFunctionData('updateSubData',
                    [subId, [strategyId, false, [triggerData], [amountEncoded]]]);

                await executeTxThroughWallet(functionData, subProxy.address);
                // deposit weth and give allowance to wallet for pull action
                await depositToWeth(pullAmount);
                await approve(WETH_ADDRESS, wallet.address);

                const beforeBalance = await balanceOf(WETH_ADDRESS, wallet.address);

                await strategyExecutorByBot.executeStrategy(
                    subId,
                    0,
                    [triggerData],
                    [actionData],
                    strategySub,
                    { gasLimit: 5000000 },
                );

                const afterBalance = await balanceOf(WETH_ADDRESS, wallet.address);
                expect(beforeBalance.add(pullAmount)).to.be.eq(afterBalance);
            });

            it(`...should execute basic placeholder recipe through ${WALLETS[i]}`, async () => {
                setupWallet(WALLETS[i]);
                const beforeBalance = await balanceOf(WETH_ADDRESS, senderAcc.address);

                await depositToWeth(pullAmount);
                await approve(WETH_ADDRESS, wallet.address);

                const dummyRecipe = new dfs.Recipe('DummyRecipe', [
                    new dfs.actions.basic.PullTokenAction(
                        WETH_ADDRESS, senderAcc.address, pullAmount,
                    ),
                    new dfs.actions.basic.SendTokenAction(
                        WETH_ADDRESS, senderAcc.address, pullAmount,
                    ),
                ]);

                const functionData = dummyRecipe.encodeForDsProxyCall()[1];

                await executeTxThroughWallet(
                    functionData, recipeExecutor.address, pullAmount, 3000000,
                );

                const afterBalance = await balanceOf(WETH_ADDRESS, senderAcc.address);
                expect(beforeBalance.add(pullAmount)).to.be.eq(afterBalance);
            });

            it(`...should execute basic recipe with FL through ${WALLETS[i]}`, async () => {
                setupWallet(WALLETS[i]);
                const beforeBalance = await balanceOf(WETH_ADDRESS, senderAcc.address);
                const dummyRecipeWithFL = new dfs.Recipe('DummyRecipeWithFl', [
                    new dfs.actions.flashloan.FLAction(
                        new dfs.actions.flashloan.BalancerFlashLoanAction(
                            [WETH_ADDRESS], [pullAmount],
                        ),
                    ),
                    new dfs.actions.basic.SendTokenAction(WETH_ADDRESS, flAddr, pullAmount),
                ]);

                const functionData = dummyRecipeWithFL.encodeForDsProxyCall()[1];

                await executeTxThroughWallet(
                    functionData, recipeExecutor.address, 0, 3000000,
                );

                const afterBalance = await balanceOf(WETH_ADDRESS, senderAcc.address);
                expect(beforeBalance).to.be.eq(afterBalance);
            });
        }
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
        let strategyExecutorByOwner;

        before(async () => {
            subProxy = await redeploy('SubProxy');
            strategyExecutor = await redeploy('StrategyExecutor');

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
                    { gasLimit: 4_000_000 },
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
                    { gasLimit: 4_000_000 },
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
                    { gasLimit: 4_000_000 },
                );
                expect(true).to.be.equal(false);
            } catch (err) {
                expect(err.toString()).to.have.string('SubNotEnabled(');
            }
        });

        it('...should test recoverOwner() function for funds rescue for the user', async () => {
            const userProxyAddr = '0xddc65fAC7201922395045FFDFfe28d3CF6012E22';

            await impersonateAccount(getOwnerAddr());

            const ownerAcc = await hre.ethers.provider.getSigner(getOwnerAddr());
            strategyExecutorByOwner = strategyExecutor.connect(ownerAcc);

            const dsProxy = await hre.ethers.getContractAt('IDSProxy', userProxyAddr);

            const ownerBefore = await dsProxy.owner();

            console.log(`Owner before ${ownerBefore}`);

            await strategyExecutorByOwner.recoverOwner({ gasLimit: 4_000_000 });

            const ownerAfter = await dsProxy.owner();

            console.log(`Owner after ${ownerAfter}`);
            expect(ownerBefore).not.to.be.eq(ownerAfter);
        });

        it('...should fail to call recoverOwner() function after the EOA is set', async () => {
            const userProxyAddr = '0xddc65fAC7201922395045FFDFfe28d3CF6012E22';

            const dsProxy = await hre.ethers.getContractAt('IDSProxy', userProxyAddr);

            const ownerBefore = await dsProxy.owner();

            console.log(`Owner before ${ownerBefore}`);

            try {
                await strategyExecutorByOwner.recoverOwner({ gasLimit: 4_000_000 });
            } catch (err) {
                await stopImpersonatingAccount(getOwnerAddr());

                const ownerAfter = await dsProxy.owner();

                expect(ownerBefore).to.be.eq(ownerAfter);
            }
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
        let dsProxy;
        let safe;
        let wallet;
        let useDsProxy;

        const executeTxThroughWallet = async (
            functionData,
            targetAddr,
            ethValue = 0,
            gl = 5000000,
        ) => {
            await (useDsProxy
                ? wallet['execute(address,bytes)'](targetAddr, functionData, { gasLimit: gl, value: ethValue })
                : executeSafeTx(senderAcc.address, wallet, targetAddr, functionData, 1, ethValue));
        };

        const setupWallet = async (w) => {
            if (isWalletNameDsProxy(w)) {
                useDsProxy = true;
                wallet = dsProxy;
            } else {
                useDsProxy = false;
                wallet = safe;
            }
        };

        before(async () => {
            const subStorageAddr = await getAddrFromRegistry('SubStorage');
            subStorage = await hre.ethers.getContractAt('SubStorage', subStorageAddr);

            subProxy = await redeploy('SubProxy');

            const strategyStorageAddr = await getAddrFromRegistry('StrategyStorage');
            strategyStorage = await hre.ethers.getContractAt('StrategyStorage', strategyStorageAddr);
            await openStrategyAndBundleStorage();

            await strategyStorage.createStrategy('TestStrategy', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);
            await strategyStorage.createStrategy('TestStrategy2', ['0x11223344'], ['0x44556677'], [[0, 1, 2]], true);

            senderAcc = (await hre.ethers.getSigners())[0];

            dsProxy = await getProxy(senderAcc.address);
            safe = await getProxy(senderAcc.address, true);
        });

        for (let i = 0; i < WALLETS.length; i++) {
            it('...should add a new subscription', async () => {
                setupWallet(WALLETS[i]);
                const numStrategies = +(await strategyStorage.getStrategyCount()) - 1;

                const subData = [numStrategies, false, [], []];
                const subDataHash = getSubHash(subData);

                const functionData = subProxy.interface.encodeFunctionData('subscribeToStrategy', [subData]);

                const numSubsBefore = await subStorage.getSubsCount();

                await executeTxThroughWallet(functionData, subProxy.address);

                const latestSub = await subStorage.getSubsCount();

                expect(latestSub).to.be.eq(+numSubsBefore + 1);
                const storedSub = await subStorage.getSub(latestSub - 1);
                expect(storedSub.strategySubHash).to.be.eq(subDataHash);
            });

            it('...should update the new subscription', async () => {
                setupWallet(WALLETS[i]);
                const numStrategies = +(await strategyStorage.getStrategyCount()) - 1;
                const latestSub = +(await subStorage.getSubsCount()) - 1;

                const updatedSubData = [numStrategies - 1, false, [], []];

                const subDataHash = getSubHash(updatedSubData);

                const functionData = subProxy.interface.encodeFunctionData('updateSubData', [latestSub, updatedSubData]);

                await executeTxThroughWallet(functionData, subProxy.address);

                const storedSub = await subStorage.getSub(latestSub);
                expect(storedSub.strategySubHash).to.be.eq(subDataHash);
            });

            it('...should deactivate users sub', async () => {
                setupWallet(WALLETS[i]);
                const latestSub = +(await subStorage.getSubsCount()) - 1;

                const functionData = subProxy.interface.encodeFunctionData('deactivateSub', [latestSub]);

                await executeTxThroughWallet(functionData, subProxy.address);

                const storedSub = await subStorage.getSub(latestSub);
                expect(storedSub.isEnabled).to.be.eq(false);
            });

            it('...should activate users sub', async () => {
                setupWallet(WALLETS[i]);
                const latestSub = +(await subStorage.getSubsCount()) - 1;

                const functionData = subProxy.interface.encodeFunctionData('activateSub', [latestSub]);

                await executeTxThroughWallet(functionData, subProxy.address);

                const storedSub = await subStorage.getSub(latestSub);
                expect(storedSub.isEnabled).to.be.eq(true);
            });
        }
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
    await dfsRegistryTest();
    await botAuthTest();
    await bundleStorageTest();
    await safeModuleAuthTest();
    await proxyAuthTest();
    await safeModuleAuthTest();
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
    strategyStorageTest,
    subProxyTest,
    subStorageTest,
};
