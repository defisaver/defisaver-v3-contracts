/* eslint-disable no-await-in-loop */
const sdk = require('@defisaver/sdk');
const { expect } = require('chai');
const hre = require('hardhat');
const { getAssetInfo, assets } = require('@defisaver/tokens');
const path = require('path');
const fs = require('fs');

const {
    redeploy,
    balanceOf,
    WETH_ADDRESS,
    ETH_ADDR,
    depositToWeth,
    impersonateAccount,
    stopImpersonatingAccount,
    MAX_UINT,
    send,
    nullAddress,
    sendEther,
    getAllowance,
    USDC_ADDR,
    ADMIN_ACC,
    getProxy,
    DFS_REG_CONTROLLER,
    getAddrFromRegistry,
    chainIds,
    setBalance,
    addrs,
    takeSnapshot,
    revertToSnapshot, getNetwork, getContractFromRegistry, getOwnerAddr,
} = require('../utils');
const {
    predictSafeAddress,
    signSafeTx,
    encodeSetupArgs,
} = require('../utils-safe');

const botRefillTest = async () => {
    describe('Bot-Refills', function () {
        this.timeout(80000);

        let botRefillsContract;
        let feeRecipientContract;
        let feeReceiverAddr;
        let refillCaller;
        const botAddr = '0x5aa40C7C8158D8E29CA480d7E05E5a32dD819332';

        before(async () => {
            botRefillsContract = await getContractFromRegistry('BotRefills');
            feeRecipientContract = await hre.ethers.getContractAt('FeeRecipient', addrs[getNetwork()].FEE_RECIPIENT_ADDR);
            feeReceiverAddr = await feeRecipientContract.getFeeAddr();
            refillCaller = addrs[getNetwork()].REFILL_CALLER;

            await impersonateAccount(feeReceiverAddr);

            let wethContract = await hre.ethers.getContractAt('IERC20', addrs[getNetwork()].WETH_ADDRESS);

            let signer = await hre.ethers.provider.getSigner(feeReceiverAddr);
            wethContract = wethContract.connect(signer);

            await wethContract.approve(botRefillsContract.address, MAX_UINT);

            await stopImpersonatingAccount(feeReceiverAddr);

            await impersonateAccount(getOwnerAddr());
            signer = await hre.ethers.provider.getSigner(getOwnerAddr());
            await botRefillsContract.connect(signer).setAdditionalBot(botAddr, true);
            await stopImpersonatingAccount(getOwnerAddr());
        });

        it('... should call refill with WETH', async () => {
            const [deployer] = await hre.ethers.getSigners();
            await sendEther(deployer, refillCaller, '10');

            await impersonateAccount(refillCaller);
            const signer = await hre.ethers.provider.getSigner(refillCaller);
            botRefillsContract = botRefillsContract.connect(signer);

            const ethBotAddrBalanceBefore = await balanceOf(ETH_ADDR, botAddr);
            const ethRefillAmount = hre.ethers.utils.parseEther('4');
            const wethFeeAddrBalance = await balanceOf(WETH_ADDRESS, feeReceiverAddr);

            if (wethFeeAddrBalance.lt(ethRefillAmount)) {
                await depositToWeth(ethRefillAmount);
                await send(WETH_ADDRESS, feeReceiverAddr, ethRefillAmount);
            }

            await botRefillsContract.refill(ethRefillAmount, botAddr);
            const ethBotAddrBalanceAfter = await balanceOf(ETH_ADDR, botAddr);

            expect(ethBotAddrBalanceAfter).to.be.eq(ethBotAddrBalanceBefore.add(ethRefillAmount));

            await stopImpersonatingAccount(refillCaller);
        });
    });
};

const feeReceiverTest = async () => {
    describe('Fee-Receiver', function () {
        this.timeout(80000);

        let feeReceiver;
        let senderAcc;

        const MULTISIG_ADDR = '0xA74e9791D7D66c6a14B2C571BdA0F2A1f6D64E06';

        before(async () => {
            /// @dev don't run dfs-registry-controller before this
            const feeReceiverAddr = await getAddrFromRegistry('FeeReceiver');
            feeReceiver = await hre.ethers.getContractAt('FeeReceiver', feeReceiverAddr);

            senderAcc = (await hre.ethers.getSigners())[0];

            await impersonateAccount(MULTISIG_ADDR);

            await sendEther(senderAcc, MULTISIG_ADDR, '0.5');

            const signer = await hre.ethers.provider.getSigner(MULTISIG_ADDR);
            feeReceiver = feeReceiver.connect(signer);
        });

        it('... should be able to withdraw 1 Weth', async () => {
            const wethAmount = hre.ethers.utils.parseUnits('3', 18);
            const oneWeth = hre.ethers.utils.parseUnits('1', 18);

            // deposit 3 weth to contract
            await depositToWeth(wethAmount);
            await send(WETH_ADDRESS, feeReceiver.address, wethAmount);

            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);

            // withdraw 1 weth
            await feeReceiver.withdrawToken(WETH_ADDRESS, senderAcc.address, oneWeth);

            const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

            // if we got that one weth to senderAcc
            expect(wethBalanceBefore.add(oneWeth)).to.be.eq(wethBalanceAfter);
        });

        it('... should be able to withdraw whole weth balance', async () => {
            const wethBalanceBefore = await balanceOf(WETH_ADDRESS, senderAcc.address);
            const contractWethBalance = await balanceOf(WETH_ADDRESS, feeReceiver.address);

            // withdraw whole weth balance
            await feeReceiver.withdrawToken(WETH_ADDRESS, senderAcc.address, 0);

            const wethBalanceAfter = await balanceOf(WETH_ADDRESS, senderAcc.address);

            // if we got that one weth to senderAcc
            expect(wethBalanceBefore.add(contractWethBalance)).to.be.eq(wethBalanceAfter);
        });

        it('... should be able to withdraw 1 Eth', async () => {
            const ethAmount = '3';
            const oneEth = hre.ethers.utils.parseUnits('1', 18);

            // deposit 3 eth to contract
            await sendEther(senderAcc, feeReceiver.address, ethAmount);

            const ethBalanceBefore = await balanceOf(ETH_ADDR, MULTISIG_ADDR);

            // withdraw 1 eth
            await feeReceiver.withdrawEth(MULTISIG_ADDR, oneEth);

            const ethBalanceAfter = await balanceOf(ETH_ADDR, MULTISIG_ADDR);

            // if we got that one eth to senderAcc
            expect(ethBalanceBefore.add(oneEth)).to.be.gt(ethBalanceAfter);
        });

        it('... should be able to withdraw whole Eth balance', async () => {
            const contractEthBalance = await balanceOf(ETH_ADDR, feeReceiver.address);
            const ethBalanceBefore = await balanceOf(ETH_ADDR, senderAcc.address);

            // withdraw whole eth balance
            await feeReceiver.withdrawEth(senderAcc.address, 0);

            const ethBalanceAfter = await balanceOf(ETH_ADDR, senderAcc.address);

            // if we got that one eth to senderAcc
            expect(ethBalanceBefore.add(contractEthBalance)).to.be.eq(ethBalanceAfter);
        });

        it('... should give approval from a contract to the address', async () => {
            const allowanceBefore = await getAllowance(
                USDC_ADDR,
                feeReceiver.address,
                senderAcc.address,
            );

            await feeReceiver.approveAddress(USDC_ADDR, senderAcc.address, MAX_UINT);

            const allowanceAfter = await getAllowance(
                USDC_ADDR,
                feeReceiver.address,
                senderAcc.address,
            );

            expect(allowanceBefore).to.be.eq(0);
            expect(allowanceAfter).to.be.eq(MAX_UINT);
        });

        it('... should remove approval from a contract to the address', async () => {
            const allowanceBefore = await getAllowance(
                USDC_ADDR,
                feeReceiver.address,
                senderAcc.address,
            );

            await feeReceiver.approveAddress(USDC_ADDR, senderAcc.address, 0);

            const allowanceAfter = await getAllowance(
                USDC_ADDR,
                feeReceiver.address,
                senderAcc.address,
            );

            expect(allowanceBefore).to.be.eq(MAX_UINT);
            expect(allowanceAfter).to.be.eq(0);
        });

        it('... should fail to withdraw Weth as the caller is not admin', async () => {
            try {
                feeReceiver = feeReceiver.connect(senderAcc);

                await feeReceiver.withdrawToken(WETH_ADDRESS, senderAcc.address, 0);
            } catch (err) {
                expect(err.toString()).to.have.string('Only Admin');
            }
        });

        it('... should fail to withdraw Eth as the caller is not admin', async () => {
            try {
                feeReceiver = feeReceiver.connect(senderAcc);

                await feeReceiver.withdrawEth(senderAcc.address, 0);

                await stopImpersonatingAccount(MULTISIG_ADDR);
            } catch (err) {
                expect(err.toString()).to.have.string('Only Admin');
            }
        });
    });
};
const dfsRegistryControllerTest = async () => {
    describe('DFS-Registry-Controller', function () {
        this.timeout(80000);

        let dfsRegController; let senderAcc;

        const ADMIN_VAULT = '0xCCf3d848e08b94478Ed8f46fFead3008faF581fD';

        before(async () => {
            dfsRegController = await hre.ethers.getContractAt('DFSProxyRegistryController', DFS_REG_CONTROLLER);

            await impersonateAccount(ADMIN_ACC);

            const signer = await hre.ethers.provider.getSigner(ADMIN_ACC);

            const adminVaultInstance = await hre.ethers.getContractFactory('AdminVault', signer);
            const adminVault = await adminVaultInstance.attach(ADMIN_VAULT);

            adminVault.connect(signer);

            console.log('dfsRegController: ', dfsRegController.address);

            // change owner in registry to dfsRegController
            await adminVault.changeOwner(dfsRegController.address);

            await stopImpersonatingAccount(ADMIN_ACC);

            senderAcc = (await hre.ethers.getSigners())[0];
            await getProxy(senderAcc.address);
        });

        it('... should create an additional proxy for the user', async () => {
            const proxiesBefore = await dfsRegController.getProxies(senderAcc.address);

            let recipe = await dfsRegController.addNewProxy({ gasLimit: 900_000 });

            recipe = await recipe.wait();

            console.log('Gas used: ', recipe.gasUsed.toString());

            const proxiesAfter = await dfsRegController.getProxies(senderAcc.address);

            // check new proxy if owner is user
            const latestProxy = proxiesAfter[proxiesAfter.length - 1];
            const dsProxy = await hre.ethers.getContractAt('IDSProxy', latestProxy);

            const owner = await dsProxy.owner();

            expect(owner).to.be.eq(senderAcc.address);
            expect(proxiesBefore.length + 1).to.be.eq(proxiesAfter.length);
        });

        it('... add to proxy pool and use that to assign new proxy', async () => {
            const proxiesBefore = await dfsRegController.getProxies(senderAcc.address);

            await dfsRegController.addToPool(1, { gasLimit: 5_000_000 });

            let recipe = await dfsRegController.addNewProxy({ gasLimit: 900_000 });
            let recipe2 = await dfsRegController.addNewProxy({ gasLimit: 900_000 });

            recipe = await recipe.wait();
            recipe2 = await recipe2.wait();

            console.log('Gas used with proxy pool: ', recipe.gasUsed.toString());
            console.log('Gas used with proxy pool: ', recipe2.gasUsed.toString());

            const proxiesAfter = await dfsRegController.getProxies(senderAcc.address);

            const latestProxy = proxiesAfter[proxiesAfter.length - 1];
            const dsProxy = await hre.ethers.getContractAt('IDSProxy', latestProxy);

            const owner = await dsProxy.owner();

            expect(owner).to.be.eq(senderAcc.address);
            expect(proxiesBefore.length + 2).to.be.eq(proxiesAfter.length);
        });
    });
};

const tokenPriceHelperTest = async () => {
    describe('Token-Price-Helper', function () {
        this.timeout(80000);

        let tokenPriceHelper; let tokenPriceHelperAddr; let tokenHelperOld;
        before(async () => {
            tokenPriceHelperAddr = await getAddrFromRegistry('TokenPriceHelper');
            tokenPriceHelper = await hre.ethers.getContractAt('TokenPriceHelper', tokenPriceHelperAddr);
            tokenHelperOld = await hre.ethers.getContractAt('TokenPriceHelper', '0xBa2e5E56A92e93Cc0Cd84626cf762E6B2b30349b');
        });

        for (let i = 0; i < assets.length; i++) {
            it(`... should get USD and ETH price for ${assets[i].symbol} `, async () => {
                if (assets[i].symbol === 'OP') return;
                if (assets[i].symbol === 'SUSHI') return;
                if (assets[i].symbol === 'USDC.e') return;
                if (assets[i].symbol === 'ARB') return;
                if (assets[i].symbol === 'GMX') return;
                const assetInfo = getAssetInfo(assets[i].symbol);
                const tokenAddr = assetInfo.address;
                const priceInUSD = await tokenPriceHelper.getPriceInUSD(tokenAddr);

                const oldPriceUSD = await tokenHelperOld.getPriceInUSD(assetInfo.address);
                /*
                const priceInETH = await tokenPriceHelper.getPriceInETH(tokenAddr);

                const clInUSD = await tokenPriceHelper.getChainlinkPriceInUSD(tokenAddr, false);
                const clPriceInETH = await tokenPriceHelper.getChainlinkPriceInETH(tokenAddr);

                const aaveInUSD = await tokenPriceHelper.getAaveTokenPriceInUSD(tokenAddr);
                const aaveInETH = await tokenPriceHelper.getAaveTokenPriceInETH(tokenAddr);

                const aaveV3InUSD = await tokenPriceHelper.getAaveV3TokenPriceInUSD(tokenAddr);
                const aaveV3InETH = await tokenPriceHelper.getAaveV3TokenPriceInETH(tokenAddr);

                const sparkInUSD = await tokenPriceHelper.getSparkTokenPriceInUSD(tokenAddr);
                const sparkInETH = await tokenPriceHelper.getSparkTokenPriceInETH(tokenAddr);

                console.log(`-----------------${assets[i].symbol}`);
                console.log(priceInUSD);
                console.log(clInUSD);
                console.log(aaveInUSD);
                console.log(aaveV3InUSD);
                console.log(sparkInUSD);
                console.log('');
                console.log(priceInETH);
                console.log(clPriceInETH);
                console.log(aaveInETH);
                console.log(aaveV3InETH);
                console.log(sparkInETH);
                console.log('------------------------');
                */

                if (oldPriceUSD.toString() !== priceInUSD.toString()) console.log(assets[i].symbol);
                // await new Promise((r) => setTimeout(r, 3000));
            });
        }
    });
};
const tokenPriceHelperL2Test = async () => {
    describe('Token-Price-Helper-L2 (Using GasFeeTakerL2)', function () {
        this.timeout(80000);

        let tokenPriceHelper; let tokenPriceHelperAddr;
        before(async () => {
            tokenPriceHelperAddr = await getAddrFromRegistry('GasFeeTakerL2');
            tokenPriceHelper = await hre.ethers.getContractAt('GasFeeTakerL2', tokenPriceHelperAddr);
        });

        for (let i = 0; i < assets.length; i++) {
            it(`... should get USD and ETH price for ${assets[i].symbol} `, async () => {
                const network = hre.network.config.name;
                const chainId = chainIds[network];
                if (assets[i].symbol === 'rETH') {
                    assets[i].addresses[42161] = '0xEC70Dcb4A1EFa46b8F2D97C310C9c4790ba5ffA8';
                }
                if (assets[i].addresses[chainId] === undefined) {
                    return;
                }
                const assetInfo = getAssetInfo(assets[i].symbol, chainId);
                const address = assetInfo.address;
                const priceInUSD = await tokenPriceHelper.getPriceInUSD(address);
                const aaveInUSD = await tokenPriceHelper.getAaveTokenPriceInUSD(address);
                const chainlinkInUSD = await tokenPriceHelper.getChainlinkPriceInUSD(
                    address, false,
                );
                const priceInETH = await tokenPriceHelper.getPriceInETH(address);
                const aaveInETH = await tokenPriceHelper.getAaveTokenPriceInETH(address);
                const chainlinkInETH = await tokenPriceHelper.getChainlinkPriceInETH(address);

                console.log(`-----------------${assets[i].symbol}`);
                console.log(priceInUSD);
                console.log(aaveInUSD);
                console.log(chainlinkInUSD);
                console.log(priceInETH);
                console.log(aaveInETH);
                console.log(chainlinkInETH);
            });
        }
    });
};
const priceFeedTest = async () => {
    describe('Price feed test', function () {
        this.timeout(80000);

        let priceFeedContract;
        let priceFeeds;
        before(async () => {
            console.log(priceFeeds);

            const network = hre.network.config.name;
            const chainId = chainIds[network];

            let priceFeedAddr;
            if (chainId === 10) {
                priceFeedAddr = '0x7E3D9e4E620842d61aB111a6DbF1be5a8cc91774';
                const filePath = path.join(__dirname, '../../addresses/priceFeeds/optimism.json');
                fs.readFile(filePath, 'utf-8', (err, data) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    priceFeeds = JSON.parse(data);
                });
            }
            if (chainId === 42161) {
                priceFeedAddr = '0x158E27De8B5E5bC3FA1C6D5b365a291c54f6b0Fd';
                const filePath = path.join(__dirname, '../../addresses/priceFeeds/arbitrum.json');
                fs.readFile(filePath, 'utf-8', (err, data) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    priceFeeds = JSON.parse(data);
                });
            }
            priceFeedContract = await hre.ethers.getContractAt('PriceFeedRegistry', priceFeedAddr);
        });

        it('... should check priceFeed for any changes', async () => {
            for (let i = 0; i < priceFeeds.length; i++) {
                const feedAddressLive = await priceFeedContract.getFeed(
                    priceFeeds[i].base, priceFeeds[i].quote,
                );
                const feed = await hre.ethers.getContractAt('IAggregatorV3', feedAddressLive);
                const latestData = await feed.latestRoundData();
                const currTimestamp = Math.floor(Date.now() / 1000);
                const lastUpdatedTimestamp = latestData.updatedAt;
                const diffInHours = (currTimestamp - lastUpdatedTimestamp) / 3600;
                if (diffInHours > 24) {
                    console.log("ALERT: Price feed hasn't been updated in 24 hours");
                }
                if (feedAddressLive !== priceFeeds[i].feedAddress) {
                    console.log(priceFeeds[i].name);
                    console.log(await feed.description());
                    console.log(priceFeeds[i]);
                    console.log(feedAddressLive);
                }
            }
        });
    });
};
const dfsSafeFactoryTest = async () => {
    describe('DFS-Safe-Factory', function () {
        this.timeout(80000);
        let dfsSafeFactory;
        let snapshotId;
        before(async () => {
            dfsSafeFactory = await redeploy('DFSSafeFactory');
        });
        beforeEach(async () => {
            snapshotId = await takeSnapshot();
        });

        afterEach(async () => {
            await revertToSnapshot(snapshotId);
        });

        it('... should create a Safe and execute a transaction on it via signature', async () => {
            const [signer] = await hre.ethers.getSigners();
            const setupArgs = [
                [signer.address], // _owners - List of Safe owners.
                1, // _threshold - Number of required confirmations for a Safe transaction.
                nullAddress, // to - Contract address for optional delegate call.
                '0x', // data - Data payload for optional delegate call.
                nullAddress, // fallbackHandler - Handler for fallback calls to this contract.
                nullAddress, // paymentToken - Token that should be used for the payment (0 is ETH)
                0, // payment - Value that should be paid.
                nullAddress, // paymentReceiver - Address that should receive the payment
            ];

            const saltNonce = '0';
            const safeFactory = await dfsSafeFactory.safeFactory();
            const singletonAddr = '0xd9db270c1b5e3bd161e8c8503c55ceabee709552';
            const predictedAddress = await predictSafeAddress(
                singletonAddr,
                setupArgs,
                saltNonce,
                safeFactory,
            );

            const network = hre.network.config.name;
            await setBalance(addrs[network].WETH_ADDRESS, predictedAddress, hre.ethers.utils.parseUnits('10', 18));
            const tokenBalanceAction = new sdk.actions.basic.TokenBalanceAction(
                addrs[network].WETH_ADDRESS,
                predictedAddress,
            );
            const recipe = new sdk.Recipe('Test Recipe',
                [tokenBalanceAction,
                    new sdk.actions.basic.SendTokenAction(
                        addrs[network].WETH_ADDRESS, signer.address, '$1',
                    )]);
            const recipeExecutor = await getAddrFromRegistry('RecipeExecutor');
            const safeTxParams = {
                to: recipeExecutor,
                value: 0,
                data: recipe.encodeForDsProxyCall()[1],
                operation: 1,
                safeTxGas: 0,
                baseGas: 0,
                gasPrice: 0,
                gasToken: hre.ethers.constants.AddressZero,
                refundReceiver: hre.ethers.constants.AddressZero,
                nonce: 0,
            };
            const signature = await signSafeTx({ address: predictedAddress }, safeTxParams, signer);
            const setupArgsEncoded = await encodeSetupArgs(setupArgs);
            await dfsSafeFactory.createSafeAndExecute(
                [singletonAddr, setupArgsEncoded, saltNonce],
                [safeTxParams.to, safeTxParams.value, safeTxParams.data, safeTxParams.operation,
                    safeTxParams.safeTxGas, safeTxParams.baseGas, safeTxParams.gasPrice,
                    safeTxParams.gasToken, safeTxParams.refundReceiver,
                    signature,
                ],
            );
            const eoaBalance = await balanceOf(addrs[network].WETH_ADDRESS, signer.address);
            const safeBalance = await balanceOf(addrs[network].WETH_ADDRESS, predictedAddress);
            expect(safeBalance).to.be.eq(0);
            expect(eoaBalance).to.be.eq(hre.ethers.utils.parseUnits('10', 18));
        });
    });
};

const deployUtilsTestsContracts = async () => {
    await redeploy('BotRefills');
    await redeploy('FeeReceiver');
};
const utilsTestsFullTest = async () => {
    await deployUtilsTestsContracts();
    await botRefillTest();
    await feeReceiverTest();
};
module.exports = {
    utilsTestsFullTest,
    botRefillTest,
    feeReceiverTest,
    dfsRegistryControllerTest,
    tokenPriceHelperTest,
    tokenPriceHelperL2Test,
    priceFeedTest,
    dfsSafeFactoryTest,
};
