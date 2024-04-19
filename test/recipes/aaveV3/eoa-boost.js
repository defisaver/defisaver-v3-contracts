const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const { getAssetInfo } = require('@defisaver/tokens');
const {
    getProxy, redeploy,
    setBalance, approve, nullAddress, fetchAmountinUSDPrice,
    addrs,
    setNewExchangeWrapper,
    formatMockExchangeObj,
    chainIds,
} = require('../../utils');
const { executeAction } = require('../../actions');

describe('Aave-EOA-Boost', function () {
    const network = hre.network.config.name;
    /// @dev when changing networks, you must change hardhat config file (networks.hardhat.chainId)
    this.timeout(150000);
    let senderAcc; let proxy; let pool; let wethAddr; let daiAddr; let chainId;
    before(async () => {
        console.log('NETWORK:', network);
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address, true);
        const mockWrapper = await redeploy('MockExchangeWrapper');
        chainId = chainIds[network];
        await setNewExchangeWrapper(senderAcc, mockWrapper.address);
        await redeploy('AaveV3DelegateWithSig');
        await redeploy('AaveV3Supply');

        wethAddr = getAssetInfo('WETH', chainId).address;
        daiAddr = getAssetInfo('DAI', chainId).address;

        const aaveMarketContract = await hre.ethers.getContractAt('IPoolAddressesProvider', addrs[network].AAVE_MARKET);
        const poolAddress = await aaveMarketContract.getPool();
        const poolContractName = 'IPoolV3';
        pool = await hre.ethers.getContractAt(poolContractName, poolAddress);

        const collAmountInUSD = fetchAmountinUSDPrice('WETH', '100000');
        const debtAmountInUSD = fetchAmountinUSDPrice('DAI', '20000');
        const supplyAmountInWei = hre.ethers.utils.parseUnits(
            collAmountInUSD, 18,
        );
        const borrowAmountWei = hre.ethers.utils.parseUnits(
            debtAmountInUSD, 18,
        );

        await setBalance(
            wethAddr, senderAcc.address, supplyAmountInWei,
        );
        await approve(wethAddr, poolAddress, senderAcc);
        console.log(pool.address);
        await pool.supply(wethAddr, supplyAmountInWei, senderAcc.address, 0);
        await pool.borrow(daiAddr, borrowAmountWei, 2, 0, senderAcc.address);
        console.log('We\'ve supplied 100k$ of WETH');
        console.log('We\'ve borrowed 20k$ DAI');
    });

    it('... should boost EOA position', async () => {
        const daiVariableDebtToken = (await pool.getReserveData(daiAddr)).variableDebtTokenAddress;
        const collAssetId = (await pool.getReserveData(wethAddr)).id;
        const debtAssetId = (await pool.getReserveData(daiAddr)).id;
        const delegator = senderAcc.address;
        const delegatee = proxy.address;
        const boostAmount = hre.ethers.utils.parseUnits('20000', 18);
        const debtTokenContract = await hre.ethers.getContractAt('IDebtToken', daiVariableDebtToken);
        const name = await debtTokenContract.name();
        const nonce = await debtTokenContract.nonces(delegator);
        const deadline = '1812843907';
        const exchangeData = await formatMockExchangeObj(
            getAssetInfo('DAI', chainId),
            getAssetInfo('WETH', chainId),
            boostAmount,
        );
        const signature = hre.ethers.utils.splitSignature(
            // @dev - _signTypedData will be renamed to signTypedData in future ethers versions
            // eslint-disable-next-line no-underscore-dangle
            await senderAcc._signTypedData(
                {
                    name, // debtToken.name
                    version: '1', // debtToken.DEBT_TOKEN_REVISION
                    chainId,
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
                    value: boostAmount,
                    nonce, // debtToken.nonces(owner)
                    deadline,
                },
            ),
        );

        const delegateWithSigAction = new dfs.actions.aaveV3.AaveV3DelegateWithSigCredit(
            daiVariableDebtToken, delegator, delegatee,
            boostAmount, deadline, signature.v, signature.r, signature.s,
        );
        const borrowAction = new dfs.actions.aaveV3.AaveV3BorrowAction(
            true, nullAddress, boostAmount, proxy.address, 2, debtAssetId, true, senderAcc.address,
        );
        const sellAction = new dfs.actions.basic.SellAction(
            exchangeData, proxy.address, proxy.address,
        );
        const supplyAction = new dfs.actions.aaveV3.AaveV3SupplyAction(
            true, nullAddress, '$3', proxy.address, wethAddr, collAssetId, false, true, senderAcc.address,
        );

        const recipe = new dfs.Recipe('AaveV3EOABoost',
            [delegateWithSigAction, borrowAction, sellAction, supplyAction]);
        const functionData = recipe.encodeForDsProxyCall()[1];
        const view = await (await hre.ethers.getContractFactory('AaveV3View')).deploy();
        const loanDataPre = await view.getLoanData(addrs[network].AAVE_MARKET, senderAcc.address);
        await executeAction('RecipeExecutor', functionData, proxy);

        const loanData = await view.getLoanData(addrs[network].AAVE_MARKET, senderAcc.address);
        expect(loanDataPre.collAmounts[0]).to.be.lt(loanData.collAmounts[0]);
        expect(loanDataPre.borrowVariableAmounts[0]).to.be.lt(loanData.borrowVariableAmounts[0]);
        console.log(`Our position currently has ${loanData.collAmounts[0] / 1e8}$ of ETH supplied`);
        console.log(`Our position currently has ${loanData.borrowVariableAmounts[0] / 1e8}$ of DAI borrowed`);
    });
});
