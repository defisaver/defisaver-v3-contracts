// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { BaseTest } from "../BaseTest.sol";
import { ActionsUtils } from "../ActionsUtils.sol";
import { RegistryUtils } from "../RegistryUtils.sol";

import {
    IAccountImplementation
} from "../../../contracts/interfaces/protocols/summerfi/IAccountImplementation.sol";
import {
    IAccountFactory
} from "../../../contracts/interfaces/protocols/summerfi/IAccountFactory.sol";
import { IAccountGuard } from "../../../contracts/interfaces/protocols/summerfi/IAccountGuard.sol";
import { IL2PoolV3 } from "../../../contracts/interfaces/protocols/aaveV3/IL2PoolV3.sol";
import { IDebtToken } from "../../../contracts/interfaces/protocols/aaveV3/IDebtToken.sol";
import { DataTypes } from "../../../contracts/interfaces/protocols/aaveV3/DataTypes.sol";

import { RecipeExecutor } from "../../../contracts/core/RecipeExecutor.sol";
import { StrategyModel } from "../../../contracts/core/strategy/StrategyModel.sol";
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Borrow } from "../../../contracts/actions/aaveV3/AaveV3Borrow.sol";
import { AaveV3Payback } from "../../../contracts/actions/aaveV3/AaveV3Payback.sol";
import { AaveV3Withdraw } from "../../../contracts/actions/aaveV3/AaveV3Withdraw.sol";
import { AaveV3Helper } from "../../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";
import { AaveV3RatioHelper } from "../../../contracts/actions/aaveV3/helpers/AaveV3RatioHelper.sol";
import { FLAction } from "../../../contracts/actions/flashloan/FLAction.sol";
import { SendToken } from "../../../contracts/actions/utils/SendToken.sol";
import { DFSSell } from "../../../contracts/actions/exchange/DFSSell.sol";
import { Addresses } from "../Addresses.sol";
import {
    SFProxyFactoryHelper
} from "../../../contracts/utils/addresses/sfProxyFactory/SFProxyFactoryHelper.sol";

contract SummerfiIntegration is
    BaseTest,
    ActionsUtils,
    RegistryUtils,
    AaveV3Helper,
    AaveV3RatioHelper,
    SFProxyFactoryHelper
{
    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/

    address constant WETH_ADDR_BASE = 0x4200000000000000000000000000000000000006;
    address constant WETH_ADDR_ARBI = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address constant WETH_ADDR_OPT = 0x4200000000000000000000000000000000000006;
    address SUPPLY_ASSET;

    address constant BORROW_ASSET_BASE = 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA;
    address constant BORROW_ASSET_ARBI = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
    address constant BORROW_ASSET_OPT = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85;
    address BORROW_ASSET;
    uint256 constant SUPPLY_AMOUNT_USD = 4000; // $4000 in USD
    uint256 constant BORROW_AMOUNT_USD = 1000; // $1000 in USD

    address constant UNI_WRAPPER_MAINNET = 0xfd077F7990AeE7A0F59b1aD98c6dBeB9aBFf0D7a;
    address constant UNI_WRAPPER_ARBI = 0x37236458C59F4dCF17b96Aa67FC07Bbf5578d873;
    address constant UNI_WRAPPER_BASE = 0x914A50910fF1404Fe62D04846a559c49C55219c3;
    address constant UNI_WRAPPER_OPT = 0xF723B39fe2Aa9102dE45Bc8ECd3417805aAC79Aa;

    address EXCHANGE_WRAPPER;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    address summerfiAccount;
    address summerfiAccountOwner;

    RecipeExecutor recipeExecutor;
    IAccountFactory accountFactory;
    IAccountGuard accountGuard;
    AaveV3Supply aaveV3Supply;
    AaveV3Borrow aaveV3Borrow;
    AaveV3Payback aaveV3Payback;
    AaveV3Withdraw aaveV3Withdraw;
    FLAction flAction;
    SendToken sendToken;
    DFSSell dfsSell;
    IL2PoolV3 aavePool;

    uint256 supplyAmount;
    uint256 borrowAmount;
    uint256 tolerance;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();
        // forkArbitrumLatest();
        // forkBaseLatest();
        // forkOptimismLatest();

        tolerance = block.chainid == 1 ? 2e16 : block.chainid == 8453 ? 15e16 : 3e16;

        SUPPLY_ASSET = block.chainid == 42_161
            ? WETH_ADDR_ARBI
            : block.chainid == 8453
                ? WETH_ADDR_BASE
                : block.chainid == 10 ? WETH_ADDR_OPT : Addresses.WETH_ADDR;

        BORROW_ASSET = block.chainid == 42_161
            ? BORROW_ASSET_ARBI
            : block.chainid == 8453
                ? BORROW_ASSET_BASE
                : block.chainid == 10 ? BORROW_ASSET_OPT : Addresses.USDC_ADDR;

        EXCHANGE_WRAPPER = block.chainid == 42_161
            ? UNI_WRAPPER_ARBI
            : block.chainid == 8453
                ? UNI_WRAPPER_BASE
                : block.chainid == 10 ? UNI_WRAPPER_OPT : UNI_WRAPPER_MAINNET;

        aavePool = getLendingPool(DEFAULT_AAVE_MARKET);
        accountFactory = IAccountFactory(SF_PROXY_FACTORY_ADDR);
        accountGuard = IAccountGuard(SF_PROXY_GUARD);

        recipeExecutor = new RecipeExecutor();
        aaveV3Supply = new AaveV3Supply();
        aaveV3Borrow = new AaveV3Borrow();
        aaveV3Payback = new AaveV3Payback();
        aaveV3Withdraw = new AaveV3Withdraw();
        flAction = new FLAction();
        sendToken = new SendToken();
        dfsSell = new DFSSell();
        redeploy("RecipeExecutor", address(recipeExecutor));
        redeploy("AaveV3Supply", address(aaveV3Supply));
        redeploy("AaveV3Borrow", address(aaveV3Borrow));
        redeploy("AaveV3Payback", address(aaveV3Payback));
        redeploy("AaveV3Withdraw", address(aaveV3Withdraw));
        redeploy("FLAction", address(flAction));
        redeploy("SendToken", address(sendToken));
        redeploy("DFSSell", address(dfsSell));

        // Create SSW
        createSummerfiSmartWallet();
        whitelistRecipeExecutor();

        // Convert USD amounts to token amounts
        supplyAmount = amountInUSDPrice(SUPPLY_ASSET, SUPPLY_AMOUNT_USD);
        borrowAmount = amountInUSDPrice(BORROW_ASSET, BORROW_AMOUNT_USD);

        give(SUPPLY_ASSET, bob, supplyAmount);
        approveAsSender(bob, SUPPLY_ASSET, summerfiAccount, supplyAmount);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function testOpenPositionOnBehalfOfEOA() public {
        _createAaveV3Position(bob);

        uint256 ratio = getSafetyRatio(DEFAULT_AAVE_MARKET, bob);
        assertGt(ratio, 1e18);
    }

    function testOpenPositionForSSW() public {
        _createAaveV3Position(summerfiAccount);

        uint256 ratio = getSafetyRatio(DEFAULT_AAVE_MARKET, summerfiAccount);
        assertGt(ratio, 1e18);
    }

    function test_RevertIf_ExecuteActionDirect_Supply_NotWhitelisted() public {
        DataTypes.ReserveData memory supplyReserve = aavePool.getReserveData(SUPPLY_ASSET);

        bytes memory actionCalldata = abi.encode(
            AaveV3Supply.Params({
                amount: supplyAmount,
                from: bob,
                assetId: supplyReserve.id,
                enableAsColl: true,
                useDefaultMarket: false,
                useOnBehalf: false,
                market: DEFAULT_AAVE_MARKET,
                onBehalf: address(0)
            })
        );

        bytes memory directCalldata =
            abi.encodeWithSelector(AaveV3Supply.executeActionDirect.selector, actionCalldata);

        vm.expectRevert("account-guard/illegal-target");
        vm.prank(summerfiAccountOwner);
        IAccountImplementation(summerfiAccount).execute(address(aaveV3Supply), directCalldata);
    }

    function testRecipeWithFlashLoan() public {
        uint256 flAmount = 10 ether;

        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = flActionEncode(SUPPLY_ASSET, flAmount, FLSource.BALANCER);
        actionsCalldata[1] = sendTokenEncode(SUPPLY_ASSET, address(flAction), flAmount);

        bytes4[] memory actionIds = new bytes4[](2);
        actionIds[0] = bytes4(keccak256("FLAction"));
        actionIds[1] = bytes4(keccak256("SendToken"));

        StrategyModel.Recipe memory recipe = _createRecipe(actionsCalldata, actionIds);

        uint256 accountWethBefore = balanceOf(SUPPLY_ASSET, summerfiAccount);

        vm.prank(summerfiAccountOwner);
        IAccountImplementation(summerfiAccount)
            .execute(
                address(recipeExecutor),
                abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe)
            );

        assertEq(balanceOf(SUPPLY_ASSET, summerfiAccount), accountWethBefore);

        assertFalse(accountGuard.canCall(summerfiAccount, address(flAction)));
    }

    function testFlashLoanRepayPosition() public {
        _createAaveV3Position(summerfiAccount);

        DataTypes.ReserveData memory borrowReserve = aavePool.getReserveData(BORROW_ASSET);
        uint256 debtBefore = balanceOf(borrowReserve.variableDebtTokenAddress, summerfiAccount);

        _repayAaveV3PositionWithFL(500);

        uint256 debtAfter = balanceOf(borrowReserve.variableDebtTokenAddress, summerfiAccount);
        assertLt(debtAfter, debtBefore);
        assertApproxEqAbs(debtBefore - debtAfter, amountInUSDPrice(BORROW_ASSET, 500), 500e6 / 10);

        assertFalse(accountGuard.canCall(summerfiAccount, address(flAction)));
    }

    function testFlashLoanClosePosition() public {
        _createAaveV3Position(summerfiAccount);

        DataTypes.ReserveData memory supplyReserve = aavePool.getReserveData(SUPPLY_ASSET);
        DataTypes.ReserveData memory borrowReserve = aavePool.getReserveData(BORROW_ASSET);

        uint256 debtAmount = borrowAmount;
        uint256 flAmount = debtAmount + 1000; // Add buffer for fees

        bytes[] memory actionsCalldata = new bytes[](6);
        actionsCalldata[0] = flActionEncode(BORROW_ASSET, flAmount, FLSource.BALANCER);
        actionsCalldata[1] = aaveV3PaybackEncode(
            type(uint256).max,
            summerfiAccount,
            2,
            borrowReserve.id,
            false,
            true,
            DEFAULT_AAVE_MARKET,
            summerfiAccount
        );
        actionsCalldata[2] = aaveV3WithdrawEncode(
            supplyReserve.id, false, type(uint256).max, summerfiAccount, DEFAULT_AAVE_MARKET
        );
        actionsCalldata[3] = sellEncodeV3(
            SUPPLY_ASSET,
            BORROW_ASSET,
            type(uint256).max,
            summerfiAccount,
            summerfiAccount,
            EXCHANGE_WRAPPER,
            3000
        );
        actionsCalldata[4] = sendTokenEncode(BORROW_ASSET, address(flAction), flAmount);

        address[] memory tokens = new address[](1);
        address[] memory receivers = new address[](1);
        uint256[] memory amounts = new uint256[](1);
        tokens[0] = BORROW_ASSET;
        receivers[0] = bob;
        amounts[0] = type(uint256).max;
        actionsCalldata[5] = sendTokensAndUnwrapEncode(tokens, receivers, amounts);

        bytes4[] memory actionIds = new bytes4[](6);
        actionIds[0] = bytes4(keccak256("FLAction"));
        actionIds[1] = bytes4(keccak256("AaveV3Payback"));
        actionIds[2] = bytes4(keccak256("AaveV3Withdraw"));
        actionIds[3] = bytes4(keccak256("DFSSell"));
        actionIds[4] = bytes4(keccak256("SendToken"));
        actionIds[5] = bytes4(keccak256("SendTokensAndUnwrap"));

        StrategyModel.Recipe memory recipe = _createRecipe(actionsCalldata, actionIds);

        vm.prank(summerfiAccountOwner);
        IAccountImplementation(summerfiAccount)
            .execute(
                address(recipeExecutor),
                abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe)
            );

        assertEq(balanceOf(SUPPLY_ASSET, summerfiAccount), 0);
        assertEq(balanceOf(BORROW_ASSET, summerfiAccount), 0);
        assertEq(balanceOf(supplyReserve.aTokenAddress, summerfiAccount), 0);
        assertEq(balanceOf(borrowReserve.variableDebtTokenAddress, summerfiAccount), 0);
        assertApproxEqRel(balanceOf(BORROW_ASSET, bob), 4e9, tolerance); // Bob should have around 4k USDC
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _repayAaveV3PositionWithFL(uint256 _repayAmountUSD) internal {
        DataTypes.ReserveData memory supplyReserve = aavePool.getReserveData(SUPPLY_ASSET);
        DataTypes.ReserveData memory borrowReserve = aavePool.getReserveData(BORROW_ASSET);

        uint256 paybackAmount = amountInUSDPrice(BORROW_ASSET, _repayAmountUSD);
        uint256 flAmount = amountInUSDPrice(SUPPLY_ASSET, _repayAmountUSD + 20);

        bytes[] memory actionsCalldata = new bytes[](4);
        actionsCalldata[0] = flActionEncode(SUPPLY_ASSET, flAmount, FLSource.BALANCER);
        actionsCalldata[1] = sellEncodeV3(
            SUPPLY_ASSET,
            BORROW_ASSET,
            flAmount,
            summerfiAccount,
            summerfiAccount,
            EXCHANGE_WRAPPER,
            3000
        );
        actionsCalldata[2] = aaveV3PaybackEncode(
            paybackAmount,
            summerfiAccount,
            2,
            borrowReserve.id,
            false,
            false,
            DEFAULT_AAVE_MARKET,
            summerfiAccount
        );
        actionsCalldata[3] = aaveV3WithdrawEncode(
            supplyReserve.id, false, flAmount, address(flAction), DEFAULT_AAVE_MARKET
        );

        bytes4[] memory actionIds = new bytes4[](4);
        actionIds[0] = bytes4(keccak256("FLAction"));
        actionIds[1] = bytes4(keccak256("DFSSell"));
        actionIds[2] = bytes4(keccak256("AaveV3Payback"));
        actionIds[3] = bytes4(keccak256("AaveV3Withdraw"));

        uint8[][] memory paramMapping = new uint8[][](4);
        paramMapping[0] = new uint8[](0);
        paramMapping[1] = new uint8[](5);
        paramMapping[2] = new uint8[](8);
        paramMapping[3] = new uint8[](5);

        StrategyModel.Recipe memory recipe = StrategyModel.Recipe({
            name: "SummerfiFlashLoanRepay",
            callData: actionsCalldata,
            subData: new bytes32[](0),
            actionIds: actionIds,
            paramMapping: paramMapping
        });

        vm.prank(summerfiAccountOwner);
        IAccountImplementation(summerfiAccount)
            .execute(
                address(recipeExecutor),
                abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe)
            );
    }

    function _createAaveV3Position(address _onBehalf) internal {
        DataTypes.ReserveData memory supplyReserve = aavePool.getReserveData(SUPPLY_ASSET);
        DataTypes.ReserveData memory borrowReserve = aavePool.getReserveData(BORROW_ASSET);

        if (_onBehalf != summerfiAccount) {
            vm.prank(_onBehalf);
            IDebtToken(borrowReserve.variableDebtTokenAddress)
                .approveDelegation(summerfiAccount, borrowAmount);
        }

        bytes[] memory actionsCalldata = new bytes[](2);
        actionsCalldata[0] = aaveV3SupplyEncode(
            supplyAmount, bob, supplyReserve.id, false, true, DEFAULT_AAVE_MARKET, _onBehalf
        );
        actionsCalldata[1] = aaveV3BorrowEncode(
            borrowAmount, bob, 2, borrowReserve.id, false, true, DEFAULT_AAVE_MARKET, _onBehalf
        );

        bytes4[] memory actionIds = new bytes4[](2);
        actionIds[0] = bytes4(keccak256("AaveV3Supply"));
        actionIds[1] = bytes4(keccak256("AaveV3Borrow"));

        StrategyModel.Recipe memory recipe = _createRecipe(actionsCalldata, actionIds);

        uint256 bobSupplyBefore = balanceOf(SUPPLY_ASSET, bob);
        uint256 bobBorrowBefore = balanceOf(BORROW_ASSET, bob);
        uint256 aTokenBefore = balanceOf(supplyReserve.aTokenAddress, _onBehalf);

        vm.prank(summerfiAccountOwner);
        IAccountImplementation(summerfiAccount)
            .execute(
                address(recipeExecutor),
                abi.encodeWithSelector(RecipeExecutor.executeRecipe.selector, recipe)
            );

        assertEq(balanceOf(SUPPLY_ASSET, bob), bobSupplyBefore - supplyAmount);
        assertEq(balanceOf(BORROW_ASSET, bob), bobBorrowBefore + borrowAmount);
        assertApproxEqAbs(
            balanceOf(supplyReserve.aTokenAddress, _onBehalf), aTokenBefore + supplyAmount, 2
        );
    }

    function _createRecipe(bytes[] memory _actionsCalldata, bytes4[] memory _actionIds)
        internal
        pure
        returns (StrategyModel.Recipe memory)
    {
        uint8[][] memory paramMapping = new uint8[][](_actionIds.length);
        for (uint256 i = 0; i < _actionIds.length; i++) {
            paramMapping[i] = new uint8[](8);
        }

        return StrategyModel.Recipe({
            name: "SummerfiAaveV3OpenPosition",
            callData: _actionsCalldata,
            subData: new bytes32[](0),
            actionIds: _actionIds,
            paramMapping: paramMapping
        });
    }

    /// @dev Creates a brand new Summerfi smart account for testing using the factory
    function createSummerfiSmartWallet() internal {
        vm.prank(bob);
        summerfiAccount = accountFactory.createAccount();
        // Bob is the owner of the newly created account
        summerfiAccountOwner = IAccountImplementation(summerfiAccount).owner();

        vm.label(summerfiAccount, "SummerfiAccount");
        vm.label(summerfiAccountOwner, "Owner");
        vm.label(address(accountGuard), "AccountGuard");
    }

    /// @dev Whitelist RecipeExecutor in the AccountGuard
    function whitelistRecipeExecutor() internal {
        address guardOwner = accountGuard.owner();

        vm.prank(guardOwner);
        accountGuard.setWhitelist(address(recipeExecutor), true);

        assert(accountGuard.isWhitelisted(address(recipeExecutor)));
    }
}
