const { expect } = require("chai");

const { getAssetInfo, ilks } = require('defisaver-tokens');

const dfs = require('defisaver-sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    send,
    formatExchangeObj,
    balanceOf,
    isEth,
    nullAddress,
    REGISTRY_ADDR,
    standardAmounts,
    UNISWAP_WRAPPER,
    WETH_ADDRESS,
    MAX_UINT
} = require('../utils');

const {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
    getVaultInfo,
} = require('../utils-mcd');

const {
    sell,
    openVault
} = require('../actions.js');

const VAULT_DAI_AMOUNT = '540';

const BigNumber = hre.ethers.BigNumber;

describe("Mcd-Close", function() {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, dydxFlAddr, mcdView, taskExecutorAddr;

    before(async () => {
        await redeploy('McdOpen');
        await redeploy('McdSupply');
        await redeploy('TaskExecutor');
        await redeploy('AddAction');
        await redeploy('McdGenerate');
        await redeploy('FLDyDx');

        mcdView = await redeploy('McdView');

        makerAddresses = await fetchMakerAddresses();

        taskExecutorAddr = await getAddrFromRegistry('TaskExecutor');
        dydxFlAddr = await getAddrFromRegistry('FLDyDx');

        await send(makerAddresses["MCD_DAI"], dydxFlAddr, '200');


        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

    });

    for (let i = 0; i < 1; ++i) {
        const ilkData = ilks[i];
        const tokenData = getAssetInfo(ilkData.asset);

        const joinAddr = ilkData.join;
        const tokenAddr = tokenData.address;

        it(`... should close a ${ilkData.ilkLabel} Vault and return Dai`, async () => {

            const vaultId = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                standardAmounts[tokenData.symbol],
                VAULT_DAI_AMOUNT
            );

            // Vault debt + 1 dai to handle stability fee
            let flAmount = (parseFloat(VAULT_DAI_AMOUNT) + 1).toString();
            flAmount = ethers.utils.parseUnits(flAmount, 18)

            const closeToDaiVaultRecipe = new dfs.ActionSet("CloseToDaiVaultRecipe", [
                new dfs.actions.flashloan.DyDxFlashLoanAction(flAmount, daiAddr),
                new dfs.actions.maker.MakerPaybackAction(vaultId, flAmount, proxy.address),
                new dfs.actions.maker.MakerWithdrawAction(vaultId, MAX_UINT, joinAddr, to),
                new dfs.actions.basic.SellAction(exchangeOrder, proxy.address, proxy.address),
                // balanceOf(Dai) - flAmount da posaljemo useru
            ]);

            const functionData = closeToDaiVaultRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000});

        });

        it(`... should close a ${ilkData.ilkLabel} Vault and return collateral`, async () => {
            const vaultId = await openVault(
                makerAddresses,
                proxy,
                joinAddr,
                tokenData,
                standardAmounts[tokenData.symbol],
                VAULT_DAI_AMOUNT
            );

            // Vault debt + 1 dai to handle stability fee
            let flAmount = (parseFloat(VAULT_DAI_AMOUNT) + 1).toString();
            flAmount = ethers.utils.parseUnits(flAmount, 18)

            const closeToCollVaultRecipe = new dfs.ActionSet("CloseToCollVaultRecipe", [
                new dfs.actions.flashloan.DyDxFlashLoanAction(flAmount, daiAddr),
                new dfs.actions.maker.MakerPaybackAction(vaultId, flAmount, proxy.address),
                new dfs.actions.maker.MakerWithdrawAction(vaultId, MAX_UINT, joinAddr, to),
                new dfs.actions.basic.SellAction(exchangeOrder, proxy.address, proxy.address),
            ]);

            const functionData = closeToCollVaultRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], { gasLimit: 3000000});

        });

    }

});
