const hre = require('hardhat');
const dfs = require('@defisaver/sdk');
const { expect } = require('chai');
const {
    addrs,
    setBalance,
    getOwnerAddr,
    getContractFromRegistry,
    getAddrFromRegistry,
    addBalancerFlLiquidity,
    BALANCER_VAULT_ADDR,
    network,
} = require('../../utils/utils');
const {
    predictSafeAddress,
    signSafeTx,
    encodeSetupArgs,
    SAFE_MASTER_COPY_VERSIONS,
} = require('../../utils/safe');
const {
    MAIN_SPOKE,
    CORE_RESERVE_ID_WSTETH,
    CORE_RESERVE_ID_USDC,
    ALL_POSITION_MANAGER_UPDATES,
    signSetUserManagersIntent,
    signBorrowPermit,
    signSetUsingAsCollateralPermission,
} = require('../../utils/aaveV4');
const { topUp } = require('../../../scripts/utils/fork');
const { signATokenPermit } = require('../../utils/aave');

const { ethers } = hre;
const { AddressZero: ZERO, MaxUint256: MAX } = ethers.constants;
const { parseUnits, formatUnits, defaultAbiCoder, id } = ethers.utils;
const COLL = CORE_RESERVE_ID_WSTETH;
const DEBT = CORE_RESERVE_ID_USDC;

const setupMigration = async () => {
    expect(hre.network.name, 'Use --network fork (Tenderly only)').to.equal('fork');
    expect((await ethers.provider.getNetwork()).chainId).to.equal(1);
    const owner = ethers.Wallet.createRandom().connect(ethers.provider);
    for (const address of [owner.address, getOwnerAddr()]) await topUp(address);

    const dependencies = {};
    for (const name of [
        'RecipeExecutor',
        'FLAction',
        'PermitToken',
        'AaveV3Payback',
        'PullToken',
        'AaveV3Withdraw',
        'AaveV4Supply',
        'AaveV4Borrow',
        'SendTokens',
        'AaveV4SetUserManagersWithSig',
        'AaveV4DelegateBorrowWithSig',
        'AaveV4DelegateSetUsingAsCollateralWithSig',
    ]) {
        const address = await getAddrFromRegistry(name);
        dependencies[name] =
            address === ZERO ? await getContractFromRegistry(name, true) : { address };
    }
    const factory = await hre.ethers.getContractAt(
        'contracts/utils/DFSSafeFactory.sol:DFSSafeFactory',
        addrs[network].DFS_SAFE_FACTORY,
        owner,
    );

    const spoke = await ethers.getContractAt('ISpoke', MAIN_SPOKE);
    const collReserve = await spoke.getReserve(COLL);
    const debtReserve = await spoke.getReserve(DEBT);
    const collateral = await ethers.getContractAt(
        'contracts/interfaces/token/IERC20.sol:IERC20',
        collReserve.underlying,
    );
    const usdc = await ethers.getContractAt(
        'contracts/interfaces/token/IERC20.sol:IERC20',
        debtReserve.underlying,
    );
    const provider = await ethers.getContractAt(
        'contracts/interfaces/protocols/aaveV3/IPoolAddressesProvider.sol:IPoolAddressesProvider',
        addrs.mainnet.AAVE_MARKET,
    );
    const pool = await ethers.getContractAt(
        'contracts/interfaces/protocols/aaveV3/IPoolV3.sol:IPoolV3',
        await provider.getPool(),
        owner,
    );
    const oracle = await ethers.getContractAt('IAaveV3Oracle', await provider.getPriceOracle());
    const [collPrice, debtPrice] = await oracle.getAssetsPrices([collateral.address, usdc.address]);
    const collateralAmount = parseUnits('250000', 8).mul(parseUnits('1', 18)).div(collPrice);
    const debtAmount = parseUnits('150000', 8).mul(parseUnits('1', 6)).div(debtPrice);
    const v3Coll = await pool.getReserveData(collateral.address);
    const v3Debt = await pool.getReserveData(usdc.address);
    const aToken = await ethers.getContractAt('IAToken', v3Coll.aTokenAddress);
    const variableDebt = await ethers.getContractAt(
        'contracts/interfaces/token/IERC20.sol:IERC20',
        v3Debt.variableDebtTokenAddress,
    );

    await setBalance(collateral.address, owner.address, collateralAmount);
    await (await collateral.connect(owner).approve(pool.address, collateralAmount)).wait();
    // Leave headroom for interest accrual between estimation and the fork's next block.
    await (
        await pool.supply(collateral.address, collateralAmount, owner.address, 0, {
            gasLimit: 1000000,
        })
    ).wait();
    await (
        await pool.borrow(usdc.address, debtAmount, 2, 0, owner.address, { gasLimit: 1000000 })
    ).wait();
    console.log(`V3 fixture ready: ${owner.address} ($250k collateral / $150k debt)`);

    const flashAmount = (await variableDebt.balanceOf(owner.address)).mul(101).div(100);
    const liquidityInjected = (await usdc.balanceOf(BALANCER_VAULT_ADDR)).lt(flashAmount);
    if (liquidityInjected) await addBalancerFlLiquidity(usdc.address);

    const setup = [[owner.address], 1, ZERO, '0x', ZERO, ZERO, 0, ZERO];
    const singleton = SAFE_MASTER_COPY_VERSIONS.V130;
    const salt = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();
    const safeAddress = await predictSafeAddress(
        singleton,
        setup,
        salt,
        await factory.safeFactory(),
    );
    expect(await ethers.provider.getCode(safeAddress)).to.equal('0x');
    return {
        owner,
        factory,
        pool,
        spoke,
        collateral,
        usdc,
        aToken,
        variableDebt,
        collAssetId: v3Coll.id,
        debtAssetId: v3Debt.id,
        flashAmount,
        liquidityInjected,
        safeAddress,
        creationArgs: [singleton, await encodeSetupArgs(setup), salt],
        flAddress: dependencies.FLAction.address,
        recipeExecutor: dependencies.RecipeExecutor.address,
    };
};

const buildMigrationRecipe = async ({
    owner,
    safeAddress,
    aToken,
    usdc,
    flashAmount,
    flAddress,
    collAssetId,
    debtAssetId,
}) => {
    const collLimit = (await aToken.balanceOf(owner.address)).mul(101).div(100);
    const permit = await signATokenPermit(owner, aToken, safeAddress, collLimit);
    const managers = await signSetUserManagersIntent(
        owner,
        MAIN_SPOKE,
        ALL_POSITION_MANAGER_UPDATES,
    );
    const config = await signSetUsingAsCollateralPermission(owner, MAIN_SPOKE, safeAddress);
    const borrow = await signBorrowPermit(owner, MAIN_SPOKE, DEBT, safeAddress, flashAmount);
    const { basic, aaveV3, aaveV4, flashloan } = dfs.actions;
    return new dfs.Recipe('AaveV3ToV4EOAMigration', [
        // #1 - Flashloan USDC debt to safe wallet
        new flashloan.FLAction(
            new flashloan.BalancerFlashLoanAction([usdc.address], [flashAmount.toString()]),
        ),
        // #2 - Approve safe wallet to pull aToken collateral
        new basic.PermitTokenAction(
            aToken.address,
            owner.address,
            safeAddress,
            collLimit.toString(),
            permit.deadline,
            permit.v,
            permit.r,
            permit.s,
        ),
        // #3 - Approve aavev4 positions managers (should be one time action)
        new aaveV4.AaveV4SetUserManagersWithSigAction(
            MAIN_SPOKE,
            owner.address,
            managers.nonce.toString(),
            managers.deadline,
            managers.signature,
            ALL_POSITION_MANAGER_UPDATES.map((u) => [u.positionManager, u.approve]),
        ),
        // #4 - Approve safe wallet to supply token as collateral on behalf of the owner
        new aaveV4.AaveV4DelegateSetUsingAsCollateralWithSigAction(
            [
                MAIN_SPOKE,
                owner.address,
                safeAddress,
                true,
                config.nonce.toString(),
                config.deadline,
            ],
            config.signature,
        ),
        // #5 - Approve safe wallet to borrow USDC debt on behalf of the owner
        new aaveV4.AaveV4DelegateBorrowWithSigAction(
            [
                MAIN_SPOKE,
                DEBT,
                owner.address,
                safeAddress,
                flashAmount.toString(),
                borrow.nonce.toString(),
                borrow.deadline,
            ],
            borrow.signature,
        ),
        // #6 - Payback aaveV3 debt on behalf of the owner
        new aaveV3.AaveV3PaybackAction(
            true,
            ZERO,
            MAX.toString(),
            safeAddress,
            2,
            usdc.address,
            debtAssetId,
            true,
            owner.address,
        ),
        // #7 - Pull aToken collateral from owner to safe wallet
        new basic.PullTokenAction(aToken.address, owner.address, MAX.toString()),
        // #8 - Withdraw collateral to safe using aTokens.
        new aaveV3.AaveV3WithdrawAction(true, ZERO, MAX.toString(), safeAddress, collAssetId),
        // # 9 - Supply collateral to aaveV4 on behalf of the owner
        new aaveV4.AaveV4SupplyAction(MAIN_SPOKE, owner.address, safeAddress, COLL, '$8', true),
        // # 10 - Borrow USDC debt on behalf of the owner to repay the flashloan without inflating V4 debt.
        new aaveV4.AaveV4BorrowAction(MAIN_SPOKE, owner.address, flAddress, DEBT, '$6'),
        // # 11 - Return unused USDC flashloan buffer
        new basic.SendTokenAction(usdc.address, flAddress, MAX.toString()),
    ]);
};

const executeMigration = async (
    { owner, factory, creationArgs, safeAddress, recipeExecutor },
    recipe,
) => {
    const safeTx = {
        to: recipeExecutor,
        value: 0,
        data: recipe.encodeForDsProxyCall()[1],
        operation: 1,
        safeTxGas: 0,
        baseGas: 0,
        gasPrice: 0,
        gasToken: ZERO,
        refundReceiver: ZERO,
        nonce: 0,
    };
    const signature = await signSafeTx({ address: safeAddress }, safeTx, owner, 1);
    const tx = await factory.createSafeAndExecute(
        creationArgs,
        [safeTx.to, 0, safeTx.data, 1, 0, 0, 0, ZERO, ZERO, signature],
        { gasLimit: 10000000 },
    );
    console.log('Migration tx hash:', tx.hash);
    return tx.wait();
};

const readPosition = async (
    { owner, pool, spoke, aToken, variableDebt, collateral, usdc, flAddress },
    at = {},
) => {
    const [drawn, premium] = await spoke.getUserDebt(DEBT, owner.address, at);
    return {
        v3Collateral: await aToken.balanceOf(owner.address, at),
        v3Debt: await variableDebt.balanceOf(owner.address, at),
        v3Account: await pool.getUserAccountData(owner.address, at),
        v4Collateral: await spoke.getUserSuppliedAssets(COLL, owner.address, at),
        v4Debt: drawn.add(premium),
        v4Account: await spoke.getUserAccountData(owner.address, at),
        walletCollateral: await collateral.balanceOf(owner.address, at),
        walletUsdc: await usdc.balanceOf(owner.address, at),
        flUsdc: await usdc.balanceOf(flAddress, at),
        vaultUsdc: await usdc.balanceOf(BALANCER_VAULT_ADDR, at),
        ownerNonce: await owner.getTransactionCount(at.blockTag),
    };
};

// Both AaveV3Payback and AaveV3Withdraw log (market, token, amount, ...).
const actionAmount = (receipt, name) => {
    const log = receipt.logs.find(
        (l) => l.topics[0] === id('ActionEvent(string,bytes)') && l.topics[1] === id(name),
    );
    const [data] = defaultAbiCoder.decode(['bytes'], log.data);
    return defaultAbiCoder.decode(['address', 'address', 'uint256'], data)[2];
};

const assertMigration = async (context, before, after, receipt) => {
    const { owner, safeAddress, spoke, collateral, usdc, aToken, variableDebt, flAddress } =
        context;
    const at = { blockTag: receipt.blockNumber };
    const safe = await ethers.getContractAt(
        'contracts/interfaces/protocols/safe/ISafe.sol:ISafe',
        safeAddress,
    );
    const dust = after.walletCollateral.sub(before.walletCollateral);
    const repaid = actionAmount(receipt, 'AaveV3Payback');
    const withdrawn = actionAmount(receipt, 'AaveV3Withdraw');

    expect(receipt.status).to.equal(1);
    expect(receipt.from, 'Migration submitted by the position owner').to.equal(owner.address);
    expect(await safe.getOwners(at)).to.deep.equal([owner.address]);
    expect(await safe.getThreshold(at)).to.equal(1);
    expect(await safe.nonce(at)).to.equal(1);
    expect(after.ownerNonce).to.equal(before.ownerNonce + 1);
    expect(after.v3Collateral, 'V3 collateral cleared').to.equal(0);
    expect(after.v3Debt, 'V3 debt cleared').to.equal(0);
    expect((await spoke.getUserReserveStatus(COLL, owner.address, at))[0]).to.equal(true);
    expect(after.v4Account.healthFactor).to.be.gt(parseUnits('1', 18));
    expect(after.v4Collateral.add(dust).sub(withdrawn).abs(), 'Collateral conservation').to.lte(10);
    expect(after.v4Debt.sub(repaid).abs(), 'Debt conservation').to.lte(2);
    expect(after.walletUsdc, 'Owner USDC did not fund migration').to.equal(before.walletUsdc);
    expect(after.flUsdc, 'No funds stranded in FLAction').to.equal(before.flUsdc);
    expect(after.vaultUsdc, 'Balancer repaid').to.equal(before.vaultUsdc);
    expect(await ethers.provider.getBalance(safeAddress, receipt.blockNumber)).to.equal(0);
    for (const token of [collateral, usdc, aToken, variableDebt]) {
        expect(await token.balanceOf(safeAddress, at), `Safe balance: ${token.address}`).to.equal(
            0,
        );
    }
    for (const reserveId of [COLL, DEBT]) {
        expect(await spoke.getUserSuppliedAssets(reserveId, safeAddress, at)).to.equal(0);
        const [drawn, premium] = await spoke.getUserDebt(reserveId, safeAddress, at);
        expect(drawn.add(premium)).to.equal(0);
    }
    expect(await safe.isModuleEnabled(flAddress, at)).to.equal(false);
};

const reportMigration = ({ owner, safeAddress }, before, after, receipt) => {
    const usd = (value) => Number(formatUnits(value, 8)).toFixed(2);
    const ratio = (coll, debt) => `${Number(coll.mul(10000).div(debt)) / 100}%`;
    const row = (V3_before, V4_after) => ({ V3_before, V4_after });
    // Normalize V4 Value (1e26/USD) and Value * RAY (1e53/USD) to V3's USD scale.
    const collBefore = before.v3Account.totalCollateralBase;
    const debtBefore = before.v3Account.totalDebtBase;
    const collAfter = after.v4Account.totalCollateralValue.div(parseUnits('1', 18));
    const debtAfter = after.v4Account.totalDebtValueRay.div(parseUnits('1', 45));
    console.log(`\nEOA: ${owner.address}\nExecution Safe (1/1): ${safeAddress}`);
    console.table({
        'wstETH collateral': row(
            formatUnits(before.v3Collateral, 18),
            formatUnits(after.v4Collateral, 18),
        ),
        'USDC debt': row(formatUnits(before.v3Debt, 6), formatUnits(after.v4Debt, 6)),
        'Collateral USD': row(usd(collBefore), usd(collAfter)),
        'Debt USD': row(usd(debtBefore), usd(debtAfter)),
        'Position equity USD': row(usd(collBefore.sub(debtBefore)), usd(collAfter.sub(debtAfter))),
        'Collateral / debt': row(ratio(collBefore, debtBefore), ratio(collAfter, debtAfter)),
        'Health factor': row(
            formatUnits(before.v3Account.healthFactor, 18),
            formatUnits(after.v4Account.healthFactor, 18),
        ),
    });
    console.log(`5 signatures / 1 owner transaction / ${receipt.gasUsed} gas`);
};

// npx hardhat test test/recipes/aaveV4/eoa-migration.js --network fork
describe('AaveV3-to-V4-EOA-Migration', function () {
    this.timeout(600000);
    let context;

    before(async () => {
        context = await setupMigration();
    });

    it('migrates wstETH/USDC with five signatures and one on-chain transaction', async () => {
        const recipe = await buildMigrationRecipe(context);
        const before = await readPosition(context);
        const receipt = await executeMigration(context, recipe);
        const after = await readPosition(context, { blockTag: receipt.blockNumber });
        await assertMigration(context, before, after, receipt);
        reportMigration(context, before, after, receipt);
    });
});
