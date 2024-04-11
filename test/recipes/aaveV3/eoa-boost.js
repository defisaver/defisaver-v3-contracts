const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const { getAssetInfoByAddress, getAssetInfo } = require('@defisaver/tokens');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
    setBalance, approve, nullAddress, fetchAmountinUSDPrice,
    addrs,
    setNewExchangeWrapper,
    formatMockExchangeObj,
} = require('../../utils');
const { executeAction } = require('../../actions');

describe('Aave-Supply', function () {
    const network = hre.network.config.name;
    this.timeout(150000);
    let senderAcc; let proxy; let pool;
    let WETH_ADDRESS;

    before(async () => {
        console.log('NETWORK:', network);
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        const mockWrapper = await redeploy('MockExchangeWrapper');
        await setNewExchangeWrapper(senderAcc, mockWrapper.address);
        await redeploy('AaveV3DelegateWithSig');

        const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
        const poolAddress = await aaveMarketContract.getPool();
        const poolContractName = network !== 'mainnet' ? 'IL2PoolV3' : 'IPoolV3';
        pool = await hre.ethers.getContractAt(poolContractName, poolAddress);

        WETH_ADDRESS = addrs[network].WETH_ADDRESS;
        const amount = hre.ethers.utils.parseUnits('100', 18);
        aWETH = (await pool.getReserveData(WETH_ADDRESS)).aTokenAddress;
        await setBalance(
            WETH_ADDRESS, senderAcc.address, amount,
        );
        await approve(WETH_ADDRESS, poolAddress, senderAcc);
        await pool.supply(WETH_ADDRESS, amount, senderAcc.address, 0);
    });

    it('... should boost EOA position', async () => {
        const daiVariableDebtToken = '0xcF8d0c70c850859266f5C338b38F9D663181C314';
        const delegator = senderAcc.address;
        const delegatee = proxy.address;
        const value = hre.ethers.utils.parseUnits('50000', 18);
        const debtTokenContract = await hre.ethers.getContractAt('IDebtToken', daiVariableDebtToken);
        const nonce = await debtTokenContract.nonces(delegator);
        const deadline = '1812843907';
        const signature = hre.ethers.utils.splitSignature(
            // @dev - _signTypedData will be renamed to signTypedData in future ethers versions
            // eslint-disable-next-line no-underscore-dangle
            await senderAcc._signTypedData(
                {
                    name: 'Aave Ethereum Variable Debt DAI', // debtToken.name
                    version: '1', // debtToken.DEBT_TOKEN_REVISION
                    chainId: 1,
                    verifyingContract: daiVariableDebtToken,
                },
                {
                    DelegationWithSig: [
                        { name: 'delegatee', type: 'address' },
                        { name: 'value', type: 'uint256' },
                        { name: 'nonce', type: 'uint256' },
                        { name: 'deadline', type: 'uint256' },
                    ],
                },
                {
                    delegatee: proxy.address,
                    value,
                    nonce, // debtToken.nonces(owner)
                    deadline,
                },
            ),
        );
        const delegateWithSigAction = new dfs.actions.aaveV3.AaveV3DelegateWithSigCredit(
            daiVariableDebtToken, delegator, delegatee,
            value, deadline, signature.v, signature.r, signature.s,
        );
        const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
            true, nullAddress, value, proxy.address, 2, 4, true, senderAcc.address,
        );
        const exchangeData = await formatMockExchangeObj(
            getAssetInfo('DAI'),
            getAssetInfo('WETH'),
            value,
        );

        const sellAction = new dfs.actions.basic.SellAction(
            exchangeData, proxy.address, proxy.address,
        );

        const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
            true, nullAddress, '$3', proxy.address, WETH_ADDRESS, 0, true, true, senderAcc.address,
        );
        const recipe = new dfs.Recipe('AaveV3EOABoost',
            [delegateWithSigAction, borrowAction, sellAction, supplyAction]);
        const functionData = recipe.encodeForDsProxyCall()[1];
        const view = await (await hre.ethers.getContractFactory('AaveV3View')).deploy();
        const loanDataPre = await view.getLoanData(addrs[network].AAVE_MARKET, senderAcc.address);
        await executeAction('RecipeExecutor', functionData, proxy);
        const loanData = await view.getLoanData(addrs[network].AAVE_MARKET, senderAcc.address);
        console.log(loanDataPre.collAmounts[0]);
        console.log(loanData.collAmounts[0]);
        console.log(loanDataPre.borrowVariableAmounts[0]);
        console.log(loanData.borrowVariableAmounts[0]);
    });
});
