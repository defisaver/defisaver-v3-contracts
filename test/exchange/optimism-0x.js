const { default: axios } = require('axios');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const {
    redeploy,
    getProxy,
    balanceOf, setBalance, approve, addrs,
    formatExchangeObjForOffchain, setNewExchangeWrapper,
} = require('../utils');

const {
    executeAction,
} = require('../actions');

describe('Dfs-Sell-Optimism 0x', function () {
    this.timeout(140000);

    let zxWrapper; let senderAcc; let
        proxy;

    const network = hre.network.config.name;

    before(async () => {
        await redeploy('DFSSell');

        zxWrapper = await redeploy('ZeroxWrapper');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);

        await setNewExchangeWrapper(senderAcc, zxWrapper.address);
    });

    it('... should try to sell WETH for USDC with offchain calldata (0x) on Optimism', async () => {
        const WETH_ADDRESS = addrs[network].WETH_ADDRESS;
        const USDC_ADDRESS = addrs[network].USDC_ADDR;
        const sellBalanceBefore = hre.ethers.utils.parseUnits('10', 18);

        await setBalance(WETH_ADDRESS, senderAcc.address, sellBalanceBefore);

        await approve(WETH_ADDRESS, proxy.address);

        const options = {
            method: 'GET',
            baseURL: 'https://optimism.api.0x.org',
            url: `/swap/v1/quote/?sellToken=${WETH_ADDRESS}&buyToken=${USDC_ADDRESS}&sellAmount=${sellBalanceBefore.toString()}&affiliateAddress=0x322d58b9E75a6918f7e7849AEe0fF09369977e08&takerAddress=0x0000000000000000000000000000000000000001&skipValidation=true`,
        };
        console.log(options.baseURL + options.url);
        const priceObject = await axios(options).then((response) => response.data);
        // THIS IS CHANGEABLE WITH API INFORMATION
        const allowanceTarget = priceObject.allowanceTarget;
        const price = 1; // just for testing, anything bigger than 0 triggers offchain if
        const protocolFee = 0;
        const callData = priceObject.data;

        const exchangeObject = formatExchangeObjForOffchain(
            WETH_ADDRESS,
            USDC_ADDRESS,
            sellBalanceBefore,
            zxWrapper.address,
            priceObject.to,
            allowanceTarget,
            price,
            protocolFee,
            callData,
        );

        const sellAction = new dfs.actions.basic.SellAction(
            exchangeObject, senderAcc.address, senderAcc.address,
        );

        const functionData = sellAction.encodeForDsProxyCall()[1];
        const buyBalanceBefore = await balanceOf(USDC_ADDRESS, senderAcc.address);

        await executeAction('DFSSell', functionData, proxy);

        const buyBalanceAfter = await balanceOf(USDC_ADDRESS, senderAcc.address);

        console.log(`ETH SOLD ${sellBalanceBefore}`);
        console.log(`USDC BOUGHT ${buyBalanceAfter}`);

        expect(buyBalanceBefore).is.lt(buyBalanceAfter);
    });
});
