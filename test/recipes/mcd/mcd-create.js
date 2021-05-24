const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo, ilks } = require('@defisaver/tokens');

const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    approve,
    formatExchangeObj,
    balanceOf,
    isEth,
    nullAddress,
    MCD_MANAGER_ADDR,
    MIN_VAULT_DAI_AMOUNT,
    WETH_ADDRESS,
    depositToWeth,
    setNewExchangeWrapper,
    fetchAmountinUSDPrice,
} = require('../../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
    getVaultInfo,
    canGenerateDebt,
} = require('../../utils-mcd');

const {
    sell,
} = require('../../actions.js');

const BigNumber = hre.ethers.BigNumber;

describe('Mcd-Create', function () {
    this.timeout(80000);

    let makerAddresses;
    let senderAcc;
    let proxy;
    let dydxFlAddr;
    // let aaveV2FlAddr;
    let mcdView;
    let taskExecutorAddr;
    let uniWrapper;

    before(async () => {
        await redeploy('McdOpen');
        await redeploy('McdSupply');
        await redeploy('TaskExecutor');
        await redeploy('SumInputs');
        await redeploy('McdGenerate');
        await redeploy('FLDyDx');
        await redeploy('FLAaveV2');

        mcdView = await redeploy('McdView');
        uniWrapper = await redeploy('UniswapWrapperV3');

        makerAddresses = await fetchMakerAddresses();

        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');
        dydxFlAddr = await getAddrFromRegistry('FLDyDx');
        // aaveV2FlAddr = await getAddrFromRegistry('FLAaveV2');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, uniWrapper.address);
    });

    for (let i = 0; i < 1; ++i) {
        const ilkData = ilks[i];
        const tokenData = getAssetInfo(ilkData.asset);

        if (tokenData.symbol === 'ETH') {
            tokenData.address = WETH_ADDRESS;
        }

        const joinAddr = ilkData.join;
        const tokenAddr = tokenData.address;

        it(`... should create a ${ilkData.ilkLabel} Vault and generate Dai`, async () => {
            const canGenerate = await canGenerateDebt(ilkData);
            if (!canGenerate) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            const amount = MIN_VAULT_DAI_AMOUNT;

            const daiAmount = hre.ethers.utils.parseUnits(amount, 18);

            const tokenBalance = await balanceOf(tokenAddr, senderAcc.address);

            const collAmount = BigNumber.from(hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice('WETH', '15000'), tokenData.decimals,
            ));

            if (tokenBalance.lt(collAmount)) {
                if (isEth(tokenAddr)) {
                    await depositToWeth(collAmount);
                } else {
                    await sell(
                        proxy,
                        WETH_ADDRESS,
                        tokenAddr,
                        hre.ethers.utils.parseUnits('5', 18),
                        uniWrapper.address,
                        senderAcc.address,
                        senderAcc.address,
                    );
                }
            }

            await approve(tokenAddr, proxy.address);

            const createVaultRecipe = new dfs.Recipe('CreateVaultRecipe', [
                new dfs.actions.maker.MakerOpenVaultAction(joinAddr, MCD_MANAGER_ADDR),
                new dfs.actions.maker.MakerSupplyAction('$1', collAmount, joinAddr, senderAcc.address, MCD_MANAGER_ADDR),
                new dfs.actions.maker.MakerGenerateAction('$1', daiAmount, senderAcc.address, MCD_MANAGER_ADDR),
            ]);

            const functionData = createVaultRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000 });

            const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);
            const vaultId = vaultsAfter.ids[vaultsAfter.ids.length - 1].toString();

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

            expect(info2.debt).to.be.eq(parseInt(amount, 10));
        });

        it(`... should create a leveraged ${ilkData.ilkLabel} Vault and generate Dai`, async () => {
            const canGenerate = await canGenerateDebt(ilkData);
            if (!canGenerate) {
                // eslint-disable-next-line no-unused-expressions
                expect(true).to.be.true;
                return;
            }

            const tokenBalance = await balanceOf(tokenAddr, senderAcc.address);

            const amount = (parseInt(MIN_VAULT_DAI_AMOUNT, 10) * 1.5).toString();

            const daiAmount = hre.ethers.utils.parseUnits(amount, 18);
            const daiAddr = makerAddresses.MCD_DAI;

            const collAmount = BigNumber.from(hre.ethers.utils.parseUnits(
                fetchAmountinUSDPrice('WETH', '15000'), tokenData.decimals,
            ));

            if (tokenBalance.lt(collAmount)) {
                if (isEth(tokenAddr)) {
                    await depositToWeth(collAmount);
                } else {
                    await sell(
                        proxy,
                        WETH_ADDRESS,
                        tokenAddr,
                        hre.ethers.utils.parseUnits('5', 18),
                        uniWrapper.address,
                        senderAcc.address,
                        senderAcc.address,
                    );
                }
            }

            await approve(tokenAddr, proxy.address);

            const exchangeOrder = formatExchangeObj(
                daiAddr,
                tokenAddr,
                daiAmount,
                uniWrapper.address,
            );

            const createVaultRecipe = new dfs.Recipe('CreateVaultRecipe', [
                // eslint-disable-next-line max-len
                // new dfs.actions.flashloan.AaveV2FlashLoanAction([daiAmount], [daiAddr], [0], nullAddress, nullAddress, []),
                new dfs.actions.flashloan.DyDxFlashLoanAction(daiAmount, daiAddr, nullAddress, []),
                new dfs.actions.basic.SellAction(exchangeOrder, proxy.address, proxy.address),
                new dfs.actions.maker.MakerOpenVaultAction(joinAddr, MCD_MANAGER_ADDR),
                new dfs.actions.basic.PullTokenAction(tokenAddr, senderAcc.address, collAmount),
                new dfs.actions.maker.MakerSupplyAction('$3', hre.ethers.constants.MaxUint256, joinAddr, proxy.address, MCD_MANAGER_ADDR),
                new dfs.actions.maker.MakerGenerateAction('$3', '$1', dydxFlAddr, MCD_MANAGER_ADDR),
            ]);

            const functionData = createVaultRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000 });

            const vaultsAfter = await getVaultsForUser(proxy.address, makerAddresses);
            const vaultId = vaultsAfter.ids[vaultsAfter.ids.length - 1].toString();

            const ratioAfter = await getRatio(mcdView, vaultId);
            const info2 = await getVaultInfo(mcdView, vaultId, ilkData.ilkBytes);
            console.log(`Ratio: ${ratioAfter.toFixed(2)}% (coll: ${info2.coll.toFixed(2)} ${tokenData.symbol}, debt: ${info2.debt.toFixed(2)} Dai)`);

            expect(info2.debt).to.be.gte(parseInt(amount, 10));
        });
    }

    // it(`... should create a leveraged UNIV2ETHDAI vault`, async () => {
    //     const uniJoinAddr = '';

    //     const uniVaultRecipe = new dfs.Recipe("CreateVaultRecipe", [
    //         new dfs.actions.maker.MakerOpenVaultAction(uniJoinAddr, MCD_MANAGER_ADDR),

    //     ]);
    // });
});
