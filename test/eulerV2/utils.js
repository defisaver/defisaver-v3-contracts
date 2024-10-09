const hre = require('hardhat');
const { fetchAmountInUSDPrice, setBalance, approve } = require('../utils');
const dfs = require('../../../defisaver-sdk');
const { executeAction } = require('../actions');

const E_WETH_2_GOVERNED = '0xD8b27CF359b7D15710a5BE299AF6e7Bf904984C2';
const E_WSTETH_2_GOVERNED = '0xbC4B4AC47582c3E38Ce5940B80Da65401F4628f1';
const E_USDC_2_GOVERNED = '0x797DD80692c3b2dAdabCe8e30C07fDE5307D48a9';

const EVC_ADDR = '0x0C9a3dd6b8F28529d72d7f9cE918D493519EE383';

const getEulerV2TestPairs = async (collAmountInUsd, debtAmountInUsd) => [
    {
        supplyVault: E_WETH_2_GOVERNED,
        supplyTokenSymbol: 'WETH',
        supplyAmount: await fetchAmountInUSDPrice('WETH', collAmountInUsd),
        borrowVault: E_USDC_2_GOVERNED,
        borrowTokenSymbol: 'USDC',
        borrowAmount: await fetchAmountInUSDPrice('USDC', debtAmountInUsd),
    },
    {
        supplyVault: E_WSTETH_2_GOVERNED,
        supplyTokenSymbol: 'wstETH',
        supplyAmount: await fetchAmountInUSDPrice('wstETH', collAmountInUsd),
        borrowVault: E_WETH_2_GOVERNED,
        borrowTokenSymbol: 'WETH',
        borrowAmount: await fetchAmountInUSDPrice('WETH', debtAmountInUsd),
    },
];

const getAccountRatio = async (account, vault) => {
    const vaultContract = await hre.ethers.getContractAt('IRiskManager', vault);
    const accountLiquidity = await vaultContract.accountLiquidity(account, false);
    return accountLiquidity[0] / accountLiquidity[1];
};

const eulerV2CreatePosition = async (
    supplyToken,
    supplyVault,
    supplyAmount,
    borrowVault,
    borrowAmount,
    senderAcc,
    proxy,
) => {
    await setBalance(supplyToken, senderAcc.address, supplyAmount);
    await approve(supplyToken, proxy.address, senderAcc);
    const supplyAction = new dfs.actions.eulerV2.EulerV2SupplyAction(
        supplyVault,
        supplyToken,
        proxy.address,
        senderAcc.address,
        supplyAmount,
        true,
    );
    const borrowAction = new dfs.actions.eulerV2.EulerV2BorrowAction(
        borrowVault,
        proxy.address,
        senderAcc.address,
        borrowAmount,
    );
    const createRecipe = new dfs.Recipe('EulerV2Create', [
        supplyAction,
        borrowAction,
    ]);
    const functionData = createRecipe.encodeForDsProxyCall();

    await executeAction('RecipeExecutor', functionData[1], proxy);
};

module.exports = {
    getEulerV2TestPairs,
    eulerV2CreatePosition,
    getAccountRatio,
    E_WETH_2_GOVERNED,
    E_WSTETH_2_GOVERNED,
    E_USDC_2_GOVERNED,
    EVC_ADDR,
};
