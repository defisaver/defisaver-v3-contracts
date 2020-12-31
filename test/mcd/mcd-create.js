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
    sell
} = require('../actions.js');

const VAULT_DAI_AMOUNT = '540';

const BigNumber = hre.ethers.BigNumber;

describe("Mcd-Create", function() {
    this.timeout(80000);

    let makerAddresses, senderAcc, proxy, dydxFlAddr, mcdView, taskExecutorAddr;

    before(async () => {
        await redeploy('McdOpen');
        await redeploy('McdSupply');
        await redeploy('TaskExecutor');
        await redeploy('SumInputs');
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

        it(`... should create a ${ilkData.ilkLabel} Vault and generate Dai`, async () => {

            const daiAmount = ethers.utils.parseUnits('520', 18);

            const tokenBalance = await balanceOf(tokenAddr, senderAcc.address);

            const collAmount = BigNumber.from(ethers.utils.parseUnits(
                standardAmounts[tokenData.symbol], tokenData.decimals));

            if (tokenBalance.lt(collAmount)) {
                await sell(
                    proxy,
                    ETH_ADDR,
                    tokenAddr,
                    ethers.utils.parseUnits('5', 18),
                    UNISWAP_WRAPPER,
                    senderAcc.address,
                    senderAcc.address
                );
            }

            let value = '0'; 

            if (isEth(tokenAddr)) {
                value = collAmount.toString();
            } else {
                await approve(tokenAddr, proxy.address);
            }

            console.log(value);

            const createVaultRecipe = new dfs.Recipe("CreateVaultRecipe", [
                new dfs.actions.maker.MakerOpenVaultAction(joinAddr, MCD_MANAGER_ADDR),
                new dfs.actions.maker.MakerSupplyAction('$1', collAmount, joinAddr, proxy.address, MCD_MANAGER_ADDR),
                new dfs.actions.maker.MakerGenerateAction('$1', daiAmount, senderAcc.address, MCD_MANAGER_ADDR)
            ]);

            const functionData = createVaultRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], {value, gasLimit: 3000000});

        });

        it(`... should create a leveraged ${ilkData.ilkLabel} Vault and generate Dai`, async () => {
            const tokenBalance = await balanceOf(tokenAddr, senderAcc.address);

            const daiAmount = ethers.utils.parseUnits('620', 18);
            const daiAddr = makerAddresses["MCD_DAI"];

            const collAmount = BigNumber.from(ethers.utils.parseUnits(
                standardAmounts[tokenData.symbol], tokenData.decimals));

            if (tokenBalance.lt(collAmount)) {
                await sell(
                    proxy,
                    ETH_ADDR,
                    tokenAddr,
                    ethers.utils.parseUnits('5', 18),
                    UNISWAP_WRAPPER,
                    senderAcc.address,
                    senderAcc.address
                );
            }

            let value = '0'; 

            if (isEth(tokenAddr)) {
                value = collAmount.toString();
            } else {
                await approve(tokenAddr, proxy.address);
            }

            const exchangeOrder = formatExchangeObj(
                daiAddr,
                tokenAddr,
                daiAmount,
                UNISWAP_WRAPPER
            );


            const createVaultRecipe = new dfs.Recipe("CreateVaultRecipe", [
                new dfs.actions.flashloan.DyDxFlashLoanAction(daiAmount, daiAddr),
                new dfs.actions.basic.SellAction(exchangeOrder, proxy.address, proxy.address),
                new dfs.actions.maker.MakerOpenVaultAction(joinAddr, MCD_MANAGER_ADDR),
                new dfs.actions.maker.MakerSupplyAction('$3', MAX_UINT, joinAddr, proxy.address, MCD_MANAGER_ADDR),
                new dfs.actions.maker.MakerGenerateAction('$3', daiAmount, dydxFlAddr, MCD_MANAGER_ADDR)
            ]);

            const functionData = createVaultRecipe.encodeForDsProxyCall();

            await proxy['execute(address,bytes)'](taskExecutorAddr, functionData[1], {value, gasLimit: 3000000});

        });

    }

    it(`... should create a leveraged UNIV2ETHDAI vault`, async () => {
        const uniJoinAddr = '';

        const uniVaultRecipe = new dfs.Recipe("CreateVaultRecipe", [
            new dfs.actions.maker.MakerOpenVaultAction(uniJoinAddr, MCD_MANAGER_ADDR),
        
        ]);
    });


});
