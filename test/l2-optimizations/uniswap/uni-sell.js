const { expect } = require('chai');
const hre = require('hardhat');

const { getAssetInfo } = require('@defisaver/tokens');
const dfs = require('@defisaver/sdk');

const {
    getProxy,
    redeploy,
    balanceOf,
    approve,
    setBalance,
    OWNER_ACC,
    impersonateAccount,
    stopImpersonatingAccount,
    Float2BN,
    BN2Float,
    getAddrFromRegistry,
} = require('../../utils');

const callDataCost = (calldata) => {
    if (calldata.slice(0, 2) === '0x') {
        // eslint-disable-next-line no-param-reassign
        calldata = calldata.slice(2);
    }

    let cost = 0;
    for (let i = 0; i < calldata.length / 2; i++) {
        if (calldata.slice(2 * i, 2 * i + 2) === '00') {
            cost += 4;
        } else {
            cost += 16;
        }
    }

    return cost;
};

describe('Uni-Sell-V3', function () {
    this.timeout(1000000);

    let senderAcc;
    let senderAddr;
    let proxy;
    let proxyAddr;

    let owner;
    let assetRegistry;
    let assetRegistryFromOwner;
    let uniswapSell;
    let RecipeExecutorAddr;

    const FeeReceiverAddr = '0x6467e807dB1E71B9Ef04E0E3aFb962E4B0900B2B';
    const NEXO_ADDR = '0xB62132e35a6c13ee1EE0f84dC5d40bad8d815206';
    const USDT_ADDR = getAssetInfo('USDT').address;

    const swapAmount = '10000';
    const swapMinOut = swapAmount; // NEXO should be more than $2 at this block

    // path taken from tx 0x781f7e8dd66c815d2d430546b82e8c2450b950073a8ec2dbc2abf70895eff756
    // at block 14437341
    const path = '0xb62132e35a6c13ee1ee0f84dc5d40bad8d815206000bb8c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20001f4a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000064dac17f958d2ee523a2206206994597c13d831ec7';
    let functionData;
    let functionDataCompressed;
    let functionDataL2;
    let functionDataL2Compressed;
    let functionDataRecipe;
    let functionDataRecipeCompressed;

    before(async () => {
        await hre.network.provider.request({
            method: 'hardhat_reset',
            params: [
                {
                    forking: {
                        jsonRpcUrl: process.env.ETHEREUM_NODE,
                        blockNumber: 14437341,
                    },
                },
            ],
        });
        assetRegistry = await redeploy('AssetRegistry');
        uniswapSell = await redeploy('UniSellV3');

        senderAcc = (await hre.ethers.getSigners())[0];
        senderAddr = senderAcc.address;
        proxy = await getProxy(senderAcc.address);
        proxyAddr = proxy.address;

        owner = await hre.ethers.provider.getSigner(OWNER_ACC);
        assetRegistryFromOwner = assetRegistry.connect(owner);

        RecipeExecutorAddr = await getAddrFromRegistry('RecipeExecutor');
        await approve(NEXO_ADDR, proxyAddr);
    });

    beforeEach(async () => {
        await setBalance(USDT_ADDR, senderAddr, Float2BN('0'));
        await setBalance(NEXO_ADDR, senderAddr, Float2BN(swapAmount));
    });

    it('... should add asset addresses to AssetRegistry', async () => {
        await impersonateAccount(OWNER_ACC);
        await assetRegistryFromOwner['bulkAddAsset(address[],bytes2[])'](
            [
                NEXO_ADDR, // NEXO
                getAssetInfo('WETH').address, // WETH
                getAssetInfo('USDC').address, // USDC
                USDT_ADDR, // USDT
            ],
            [
                '0x0000',
                '0x0001',
                '0x0002',
                '0x0003',
            ],
        );
        await stopImpersonatingAccount(OWNER_ACC);
    });

    it('... should compress path for action calls', async () => {
        const paramsUncompressedPath = [
            senderAddr,
            senderAddr,
            Float2BN(swapAmount),
            Float2BN(swapMinOut, 6),
            NEXO_ADDR,
            false,
            path,
        ];
        const paramsCompressedPath = [
            ...paramsUncompressedPath.slice(0, 5),
            true,
            await uniswapSell['compressPath(bytes)'](path),
        ];

        let action = new dfs.actions.uniswapV3.UniswapV3SellAction(...paramsUncompressedPath);
        functionData = action.encodeForDsProxyCall()[1];

        action = new dfs.actions.uniswapV3.UniswapV3SellAction(...paramsCompressedPath);
        functionDataCompressed = action.encodeForDsProxyCall()[1];

        action = new dfs.actions.uniswapV3.UniswapV3SellAction(...paramsUncompressedPath);
        functionDataL2 = action.encodeForL2DsProxyCall();

        action = new dfs.actions.uniswapV3.UniswapV3SellAction(...paramsCompressedPath);
        functionDataL2Compressed = action.encodeForL2DsProxyCall();

        let sellAction = new dfs.actions.uniswapV3.UniswapV3SellAction(
            ...paramsUncompressedPath,
        );
        let recipe = new dfs.Recipe('SingleActionRecipe', [
            sellAction,
        ]);
        functionDataRecipe = recipe.encodeForDsProxyCall()[1];

        sellAction = new dfs.actions.uniswapV3.UniswapV3SellAction(
            ...paramsCompressedPath,
        );
        recipe = new dfs.Recipe('SingleActionRecipe', [
            sellAction,
        ]);
        functionDataRecipeCompressed = recipe.encodeForDsProxyCall()[1];
    });

    it('... should test executeActionDirect', async () => {
        await proxy['execute(address,bytes)'](uniswapSell.address, functionData, { gasLimit: 3000000 });

        expect(+BN2Float(await balanceOf(USDT_ADDR, senderAddr), 6)).to.be.gt(+swapMinOut);
        console.log(`L1 gas cost: ${callDataCost(functionData)}`);
    });

    it('... should test executeActionDirect using compressed path', async () => {
        await proxy['execute(address,bytes)'](uniswapSell.address, functionDataCompressed, { gasLimit: 3000000 });

        expect(+BN2Float(await balanceOf(USDT_ADDR, senderAddr), 6)).to.be.gt(+swapMinOut);
        console.log(`L1 gas saved: ${callDataCost(functionData) - callDataCost(functionDataCompressed)}`);
    });

    it('... should test executeActionDirectL2', async () => {
        await proxy['execute(address,bytes)'](uniswapSell.address, functionDataL2, { gasLimit: 3000000 });

        expect(+BN2Float(await balanceOf(USDT_ADDR, senderAddr), 6)).to.be.gt(+swapMinOut);
        console.log(`L1 gas saved: ${callDataCost(functionData) - callDataCost(functionDataL2)}`);
    });

    it('... should test executeActionDirectL2 using compressed path', async () => {
        await proxy['execute(address,bytes)'](uniswapSell.address, functionDataL2Compressed, { gasLimit: 3000000 });

        expect(+BN2Float(await balanceOf(USDT_ADDR, senderAddr), 6)).to.be.gt(+swapMinOut);
        console.log(`L1 gas saved: ${callDataCost(functionData) - callDataCost(functionDataL2Compressed)}`);
    });

    it('... should test executeAction', async () => {
        const feesBefore = await balanceOf(NEXO_ADDR, FeeReceiverAddr);

        await proxy['execute(address,bytes)'](RecipeExecutorAddr, functionDataRecipe, { gasLimit: 3000000 });

        const feesAfter = await balanceOf(NEXO_ADDR, FeeReceiverAddr);
        expect(+BN2Float(await balanceOf(USDT_ADDR, senderAddr), 6)).to.be.gt(+swapMinOut);
        expect(+BN2Float(feesAfter)).to.be.eq(+BN2Float(feesBefore) + swapAmount * 0.0025);

        console.log(`L1 gas cost: ${callDataCost(functionDataRecipe)} (single action recipe)`);
    });

    it('... should test executeAction using compressed path', async () => {
        const feesBefore = await balanceOf(NEXO_ADDR, FeeReceiverAddr);

        await proxy['execute(address,bytes)'](RecipeExecutorAddr, functionDataRecipeCompressed, { gasLimit: 3000000 });

        const feesAfter = await balanceOf(NEXO_ADDR, FeeReceiverAddr);
        expect(+BN2Float(await balanceOf(USDT_ADDR, senderAddr), 6)).to.be.gt(+swapMinOut);
        expect(+BN2Float(feesAfter)).to.be.eq(+BN2Float(feesBefore) + swapAmount * 0.0025);

        console.log(`L1 gas saved: ${callDataCost(functionDataRecipe) - callDataCost(functionDataRecipeCompressed)}`);
    });
});
