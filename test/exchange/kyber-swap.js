const { default: axios } = require('axios');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const {
    redeploy,
    getProxy,
    balanceOf, setBalance, approve, addrs,
    formatExchangeObjForOffchain, setNewExchangeWrapper, addToZRXAllowlist,
    getAddrFromRegistry, takeSnapshot, revertToSnapshot,
} = require('../utils');

const {
    executeAction,
} = require('../actions');

describe('Dfs-Sell-Arbitrum KyberSwap', function () {
    this.timeout(140000);

    let ooWrapper; let senderAcc; let
        proxy; let recipeExecutorAddr;
    let snapshotId;

    const network = hre.network.config.name;

    before(async () => {
        await redeploy('DFSSell');

        ooWrapper = await redeploy('KyberSwapWrapper');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        recipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');
        await setNewExchangeWrapper(senderAcc, ooWrapper.address);
    });
    beforeEach(async () => {
        snapshotId = await takeSnapshot();
    });

    afterEach(async () => {
        await revertToSnapshot(snapshotId);
    });

    it('... should try to sell WETH for USDC with offchain calldata (KyberSwap) on Arbitrum in a direct action', async () => {
        const WETH_ADDRESS = addrs[network].WETH_ADDRESS;
        const USDC_ADDRESS = addrs[network].USDC_ADDR;
        const sellBalanceBefore = hre.ethers.utils.parseUnits('10', 18);

        await setBalance(WETH_ADDRESS, senderAcc.address, sellBalanceBefore);

        await approve(WETH_ADDRESS, proxy.address);

        const options = {
            method: 'GET',
            baseURL: 'https://aggregator-api.kyberswap.com/arbitrum/route',
            url: `/encode?tokenIn=${WETH_ADDRESS}&tokenOut=${USDC_ADDRESS}&amountIn=${sellBalanceBefore}&dexes=balancer,curve,dodo,swapr,sushiswap&saveGas=0&gasInclude=0&slippageTolerance=100&deadline=1691437740&to=${ooWrapper.address}&chargeFeeBy=&feeReceiver=&isInBps=&feeAmount=&clientData=%7B%22source%22%3A%22kyberswap%22%7D`,
            headers: {
                'Accept-Version': 'latest',
            },
        };
        console.log(options.baseURL + options.url);
        const priceObject = await axios(options).then((response) => response.data);
        //priceObject.routerAddress = '0x617Dee16B86534a5d792A4d7A62FB491B544111E';
        console.log(priceObject);
        if (priceObject.code === 500) {
            console.log('DEAD');
            return;
        }
        // THIS IS CHANGEABLE WITH API INFORMATION
        const allowanceTarget = priceObject.routerAddress;
        const price = 1; // just for testing, anything bigger than 0 triggers offchain if
        const protocolFee = 0;
        const callData = priceObject.encodedSwapData;
        const kyberSpecialCalldata = hre.ethers.utils.defaultAbiCoder.encode(['(bytes,uint256[])'], [[callData, []]]);

        const exchangeObject = formatExchangeObjForOffchain(
            WETH_ADDRESS,
            USDC_ADDRESS,
            sellBalanceBefore,
            ooWrapper.address,
            priceObject.routerAddress,
            allowanceTarget,
            price,
            protocolFee,
            kyberSpecialCalldata,
        );
        const sellAction = new dfs.actions.basic.SellAction(
            exchangeObject, senderAcc.address, senderAcc.address,
        );
        const functionData = sellAction.encodeForDsProxyCall()[1];
        const buyBalanceBefore = await balanceOf(USDC_ADDRESS, senderAcc.address);
        await addToZRXAllowlist(senderAcc, priceObject.routerAddress);
        await executeAction('DFSSell', functionData, proxy);

        const buyBalanceAfter = await balanceOf(USDC_ADDRESS, senderAcc.address);

        console.log(`ETH SOLD ${sellBalanceBefore}`);
        console.log(`USDC BOUGHT ${buyBalanceAfter.sub(buyBalanceBefore)}`);

        expect(buyBalanceBefore).is.lt(buyBalanceAfter);
    });

    it('... should try to sell WETH for USDC with offchain calldata (KyberSwap) on Arbitrum in a recipe', async () => {
        const WETH_ADDRESS = addrs[network].WETH_ADDRESS;
        const USDC_ADDRESS = addrs[network].USDC_ADDR;
        const sellBalanceBefore = hre.ethers.utils.parseUnits('10', 18);

        await setBalance(WETH_ADDRESS, senderAcc.address, sellBalanceBefore);

        await approve(WETH_ADDRESS, proxy.address);

        const options = {
            method: 'GET',
            baseURL: 'https://aggregator-api.kyberswap.com/arbitrum/route',
            url: `/encode?tokenIn=${WETH_ADDRESS}&tokenOut=${USDC_ADDRESS}&amountIn=${sellBalanceBefore}&dexes=balancer,curve,dodo,swapr,sushiswap&saveGas=0&gasInclude=0&slippageTolerance=100&deadline=1691437740&to=${ooWrapper.address}&chargeFeeBy=&feeReceiver=&isInBps=&feeAmount=&clientData=%7B%22source%22%3A%22kyberswap%22%7D`,
            headers: {
                'Accept-Version': 'latest',
            },
        };
        // balancer,curve,dodo,swapr,sushiswap
        console.log(options.baseURL + options.url);
        const priceObject = await axios(options).then((response) => response.data);
        //priceObject.routerAddress = '0x617Dee16B86534a5d792A4d7A62FB491B544111E';
        console.log(priceObject);
        if (priceObject.code === 500) {
            console.log('DEAD');
            return;
        }
        // THIS IS CHANGEABLE WITH API INFORMATION
        const allowanceTarget = priceObject.routerAddress;
        const price = 1; // just for testing, anything bigger than 0 triggers offchain if
        const protocolFee = 0;
        const callData = priceObject.encodedSwapData;

        let amountInHex = hre.ethers.utils.defaultAbiCoder.encode(['uint256'], [sellBalanceBefore]);
        amountInHex = amountInHex.slice(2);

        let index = callData.indexOf(amountInHex);
        const indexes = [];
        while (index >= 0) {
            indexes.push(index / 2 - 1); // should always be even number
            index = callData.indexOf(amountInHex, index + 1);
        }
        const kyberSpecialCalldata = hre.ethers.utils.defaultAbiCoder.encode(['(bytes,uint256[])'], [[callData, indexes]]);
        const exchangeObject = formatExchangeObjForOffchain(
            WETH_ADDRESS,
            USDC_ADDRESS,
            sellBalanceBefore,
            ooWrapper.address,
            priceObject.routerAddress,
            allowanceTarget,
            price,
            protocolFee,
            kyberSpecialCalldata,
        );
        const wrapRecipe = new dfs.Recipe('WrapRecipe', [
            new dfs.actions.basic.WrapEthAction(sellBalanceBefore),
            new dfs.actions.basic.SellAction(exchangeObject, proxy.address, senderAcc.address),
        ]);

        const functionData = wrapRecipe.encodeForDsProxyCall();

        const buyBalanceBefore = await balanceOf(USDC_ADDRESS, senderAcc.address);
        await addToZRXAllowlist(senderAcc, priceObject.routerAddress);

        await proxy['execute(address,bytes)'](recipeExecutorAddr, functionData[1], {
            gasLimit: 3000000,
            value: sellBalanceBefore,
        });
        const buyBalanceAfter = await balanceOf(USDC_ADDRESS, senderAcc.address);

        console.log(`ETH SOLD ${sellBalanceBefore}`);
        console.log(`USDC BOUGHT ${buyBalanceAfter.sub(buyBalanceBefore)}`);

        expect(buyBalanceBefore).is.lt(buyBalanceAfter);
    });
});
