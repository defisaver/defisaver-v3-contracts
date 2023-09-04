const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');

const {
    redeploy,
    nullAddress,
    setBalance,
    approve,
    WETH_ADDRESS,
    balanceOf,
    formatExchangeObj,
    DAI_ADDR,
    UNISWAP_WRAPPER,
} = require('../utils');

const SAFE_PROXY_FACTORY_ADDR = '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67';
const SAFE_SINGLETON_ADDR = '0x41675C099F32341bf84BFc5382aF534df5C7461a';

const abiCoder = new hre.ethers.utils.AbiCoder();

const createSafe = async (senderAcc) => {
    const safeProxyFactory = await hre.ethers.getContractAt('ISafeProxyFactory', SAFE_PROXY_FACTORY_ADDR);

    const saltNonce = Date.now();
    const setupData = [
        [senderAcc.address], // owner
        1, // threshold
        nullAddress, // to module address
        [], // data for module
        nullAddress, // fallback handler
        nullAddress, // payment token
        0, // payment
        nullAddress, // payment receiver
    ];

    const safeInterface = await hre.ethers.getContractAt('ISafe', SAFE_SINGLETON_ADDR);
    const functionData = safeInterface.interface.encodeFunctionData(
        'setup',
        setupData,
    );

    let receipt = await safeProxyFactory.createProxyWithNonce(
        SAFE_SINGLETON_ADDR,
        functionData,
        saltNonce,
    );
    receipt = await receipt.wait();

    // fetch deployed safe addr
    const safeAddr = abiCoder.decode(['address'], receipt.events.reverse()[0].topics[1]);

    return safeAddr[0];
};

const signAndExecuteSafeTx = async (
    senderAcc,
    safeInstance,
    targetAddr,
    calldata,
    callType = 1,
    ethValue = 0,
) => {
    const nonce = await safeInstance.nonce();

    const txHash = await safeInstance.getTransactionHash(
        targetAddr, // to
        ethValue, // eth value
        calldata, // action calldata
        callType, // 1 is delegate call
        0, // safeTxGas
        0, // baseGas
        0, // gasPrice
        nullAddress, // gasToken
        nullAddress, // refundReceiver
        nonce, // nonce
    );

    console.log(txHash);

    const sig = (await senderAcc.signMessage(hre.ethers.utils.arrayify(txHash))).replace(/1b$/, '1f').replace(/1c$/, '20');

    // call safe function
    await safeInstance.execTransaction(
        targetAddr,
        ethValue,
        calldata,
        callType,
        0,
        0,
        0,
        nullAddress,
        nullAddress,
        sig,
        { gasLimit: 8_000_000 },
    );
};

describe('Safe-wallet-tests', function () {
    this.timeout(80000);

    let senderAcc;
    let safeAddr;
    let safeInstance;
    let pullTokenInstance;
    let recipeExecutor;
    let flBalancer;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];

        safeAddr = await createSafe(senderAcc);

        safeInstance = await hre.ethers.getContractAt('ISafe', safeAddr);

        pullTokenInstance = await redeploy('PullToken');
        recipeExecutor = await redeploy('RecipeExecutor');
        await redeploy('DFSSell');
        flBalancer = await redeploy('FLBalancer');

        console.log('Safe addr: ', safeAddr);
    });

    // it('... should execute basic pullToken action directly through gnosis', async () => {
    //     await setBalance(WETH_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('10', 18));

    //     await approve(WETH_ADDRESS, safeAddr);

    //     const pullAmountInWei = hre.ethers.utils.parseUnits('3', 18);
    //     const pullTokenAction = new dfs.actions.basic.PullTokenAction(
    //         WETH_ADDRESS, senderAcc.address, pullAmountInWei,
    //     );

    //     const pullTokenData = pullTokenAction.encodeForDsProxyCall()[1];

    //     const safeWethBalanceBefore = await balanceOf(WETH_ADDRESS, safeAddr);

    //     await signAndExecuteSafeTx(
    //         senderAcc,
    //         safeInstance,
    //         pullTokenInstance.address,
    //         pullTokenData,
    //     );

    //     const safeWethBalanceAfter = await balanceOf(WETH_ADDRESS, safeAddr);

    //     expect(safeWethBalanceAfter).to.be.equal(safeWethBalanceBefore.add(pullAmountInWei));
    // });

    it('... should execute recipe directly on safe with a FL and a dfs sell action', async () => {
        await setBalance(WETH_ADDRESS, senderAcc.address, hre.ethers.utils.parseUnits('10', 18));

        await approve(WETH_ADDRESS, safeAddr);

        const flAmountInWei = hre.ethers.utils.parseUnits('3', 18);

        const flAction = new dfs.actions.flashloan.BalancerFlashLoanAction(
            [WETH_ADDRESS], [flAmountInWei],
        );

        const sellAction = new dfs.actions.basic.SellAction(
            formatExchangeObj(
                WETH_ADDRESS,
                DAI_ADDR,
                flAmountInWei,
                UNISWAP_WRAPPER,
            ),
            safeAddr,
            safeAddr,
        );

        const pullTokenAction = new dfs.actions.basic.PullTokenAction(
            WETH_ADDRESS, senderAcc.address, flAmountInWei,
        );

        const repayFlAction = new dfs.actions.basic.SendTokenAction(
            WETH_ADDRESS, flBalancer.address, flAmountInWei,
        );

        const recipe = new dfs.Recipe('FLSwapPullForRepay', [
            flAction,
            sellAction,
            pullTokenAction,
            repayFlAction,
        ]);

        const recipeData = recipe.encodeForDsProxyCall()[1];

        await signAndExecuteSafeTx(
            senderAcc,
            safeInstance,
            recipeExecutor.address,
            recipeData,
        );
    });
});
