const { default: axios } = require('axios');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const {
    redeploy,
    getProxy,
    balanceOf, setBalance, approve, addrs,
    formatExchangeObjForOffchain, setNewExchangeWrapper, addToZRXAllowlist, getAddrFromRegistry, setCode,
} = require('../utils');

const {
    executeAction,
} = require('../actions');
const openOceanExchangeBytecode = require('../../artifacts/contracts/OpenOceanExchange.sol/OpenOceanExchange.json').deployedBytecode;
describe('Dfs-Sell-Optimism 0x', function () {
    this.timeout(140000);

    let ooWrapper; let senderAcc; let
        proxy; let recipeExecutorAddr;

    const network = hre.network.config.name;

    before(async () => {
        await redeploy('DFSSell');

        ooWrapper = await redeploy('OpenOceanWrapper');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        await setCode('0xA9f983a0D33a6Fa782ddD29C93649F7D65dF4DD9', openOceanExchangeBytecode);
        await setCode('0x2b5f704ab7061fb4dbfc5876b024f4bdb2f5e8b6', openOceanExchangeBytecode);

        recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');
        await setNewExchangeWrapper(senderAcc, ooWrapper.address);
    });

    it('... should try to sell WETH for USDC with offchain calldata (OpenOcean) on Arbitrum in a direct action', async () => {
        const WETH_ADDRESS = addrs[network].WETH_ADDRESS;
        const USDC_ADDRESS = addrs[network].USDC_ADDR;
        const sellBalanceBefore = hre.ethers.utils.parseUnits('10', 18);

        await setBalance(WETH_ADDRESS, senderAcc.address, sellBalanceBefore);

        await approve(WETH_ADDRESS, proxy.address);

        const options = {
            method: 'GET',
            baseURL: 'https://open-api.openocean.finance/v3',
            url: `/arbitrum/swap_quote/?inTokenAddress=${WETH_ADDRESS}&outTokenAddress=${USDC_ADDRESS}&amount=${10}&gasPrice=1&slippage=99&account=${ooWrapper.address}`,
        };

        // 1 - works (SushiSwap)
        // 2 - big data, fails (BalancerV2)
        // 3 - works (UniswapV3)
        // 4 - no tx data returned (Curve)
        // 5 - big data, fails (DODOv1)
        // 6 - no tx data returned (Synapse)
        // 7 - works (Swapr)
        // 8 - big data, fails (GMX)
        // 9 - big data, fails (Hashflow)
        // 10 - no tx data returned (Kyberswap)
        // 11 - no tx data returned (CurveV2)

        console.log(options.baseURL + options.url);
        let priceObject = await axios(options).then((response) => response.data);

        console.log(priceObject);
        if (priceObject.code === 500) {
            console.log('DEAD');
            return;
        }
        priceObject = priceObject.data;
        // THIS IS CHANGEABLE WITH API INFORMATION
        const allowanceTarget = priceObject.to;
        const price = 1; // just for testing, anything bigger than 0 triggers offchain if
        const protocolFee = 0;
        const callData = priceObject.data;
        console.log('DSDds');
        const exchangeObject = formatExchangeObjForOffchain(
            WETH_ADDRESS,
            USDC_ADDRESS,
            sellBalanceBefore,
            ooWrapper.address,
            priceObject.to,
            allowanceTarget,
            price,
            protocolFee,
            callData,
        );
        const sellAction = new dfs.actions.basic.SellAction(
            exchangeObject, senderAcc.address, senderAcc.address,
        );
        console.log(exchangeObject);
        const functionData = sellAction.encodeForDsProxyCall()[1];
        console.log(USDC_ADDRESS);
        const buyBalanceBefore = await balanceOf(USDC_ADDRESS, senderAcc.address);
        await addToZRXAllowlist(senderAcc, priceObject.to);
        await executeAction('DFSSell', functionData, proxy);

        const buyBalanceAfter = await balanceOf(USDC_ADDRESS, senderAcc.address);

        console.log(`ETH SOLD ${sellBalanceBefore}`);
        console.log(`USDC BOUGHT ${buyBalanceAfter.sub(buyBalanceBefore)}`);

        expect(buyBalanceBefore).is.lt(buyBalanceAfter);
    });
    /*
    it('... should try to sell WETH for USDC with offchain calldata (OpenOcean) on Arbitrum in a recipe', async () => {
        const WETH_ADDRESS = addrs[network].WETH_ADDRESS;
        const USDC_ADDRESS = addrs[network].USDC_ADDR;
        const sellBalanceBefore = hre.ethers.utils.parseUnits('10', 18);

        const options = {
            method: 'GET',
            baseURL: 'https://open-api.openocean.finance/v3',
            url: `/arbitrum/swap_quote/?inTokenAddress=${WETH_ADDRESS}&outTokenAddress=${USDC_ADDRESS}&amount=${10}&gasPrice=1&slippage=100&account=${ooWrapper.address}&referrer=0x0000000000000000000000000000000000000000`,
        };

        console.log(options.baseURL + options.url);
        let priceObject = await axios(options).then((response) => response.data);

        console.log(priceObject);
        if (priceObject.code === 500) {
            console.log('DEAD');
            return;
        }
        priceObject = priceObject.data;
        // THIS IS CHANGEABLE WITH API INFORMATION
        const allowanceTarget = priceObject.to;
        const price = 1; // just for testing, anything bigger than 0 triggers offchain if
        const protocolFee = 0;
        const callData = priceObject.data;
        console.log('DSDds');
        const exchangeObject = formatExchangeObjForOffchain(
            WETH_ADDRESS,
            USDC_ADDRESS,
            sellBalanceBefore,
            ooWrapper.address,
            priceObject.to,
            allowanceTarget,
            price,
            protocolFee,
            callData,
        );
        const wrapRecipe = new dfs.Recipe('WrapRecipe', [
            new dfs.actions.basic.WrapEthAction(sellBalanceBefore),
            new dfs.actions.basic.SellAction(exchangeObject, proxy.address, senderAcc.address),
        ]);

        const functionData = wrapRecipe.encodeForDsProxyCall();

        console.log(exchangeObject);
        console.log(USDC_ADDRESS);
        const buyBalanceBefore = await balanceOf(USDC_ADDRESS, senderAcc.address);
        await addToZRXAllowlist(senderAcc, priceObject.to);

        await proxy['execute(address,bytes)'](recipeExecutorAddr, functionData[1], {
            gasLimit: 3000000,
            value: sellBalanceBefore,
        });
        const buyBalanceAfter = await balanceOf(USDC_ADDRESS, senderAcc.address);

        console.log(`ETH SOLD ${sellBalanceBefore}`);
        console.log(`USDC BOUGHT ${buyBalanceAfter}`);

        expect(buyBalanceBefore).is.lt(buyBalanceAfter);
    });
    */
});
