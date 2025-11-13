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

// import { console2 as console } from "forge-std/console2.sol";

contract SummerfiIntegration is
    BaseTest,
    ActionsUtils,
    RegistryUtils,
    AaveV3Helper,
    AaveV3RatioHelper
{
    /*//////////////////////////////////////////////////////////////////////////
                                    CONSTANTS
    //////////////////////////////////////////////////////////////////////////*/
    address constant SUMMERFI_ACCOUNT_FACTORY = 0xF7B75183A2829843dB06266c114297dfbFaeE2b6;
    address constant SUMMERFI_GUARD = 0xCe91349d2A4577BBd0fC91Fe6019600e047f2847;
    address constant SUPPLY_ASSET = Addresses.WETH_ADDR;
    uint256 constant SUPPLY_AMOUNT_USD = 4000; // $4000 in USD
    address constant BORROW_ASSET = Addresses.USDC_ADDR;
    uint256 constant BORROW_AMOUNT_USD = 1000; // $1000 in USD

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    address summerfiAccount;
    address summerfiAccountOwner;

    RecipeExecutor recipeExecutor;
    IAccountFactory accountFactory;
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

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        aavePool = getLendingPool(DEFAULT_AAVE_MARKET);
        accountFactory = IAccountFactory(SUMMERFI_ACCOUNT_FACTORY);

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

        IAccountGuard accountGuard = IAccountGuard(SUMMERFI_GUARD);
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

        IAccountGuard accountGuard = IAccountGuard(SUMMERFI_GUARD);
        assertFalse(accountGuard.canCall(summerfiAccount, address(flAction)));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _repayAaveV3PositionWithFL(uint256 _repayAmountUSD) internal {
        DataTypes.ReserveData memory supplyReserve = aavePool.getReserveData(SUPPLY_ASSET);
        DataTypes.ReserveData memory borrowReserve = aavePool.getReserveData(BORROW_ASSET);

        uint256 paybackAmount = amountInUSDPrice(BORROW_ASSET, _repayAmountUSD);
        uint256 flAmount = amountInUSDPrice(SUPPLY_ASSET, _repayAmountUSD + 10);

        bytes[] memory actionsCalldata = new bytes[](4);
        actionsCalldata[0] = flActionEncode(SUPPLY_ASSET, flAmount, FLSource.BALANCER);
        actionsCalldata[1] = sellEncode(
            SUPPLY_ASSET,
            BORROW_ASSET,
            flAmount,
            summerfiAccount,
            summerfiAccount,
            Addresses.UNI_V2_WRAPPER
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
        vm.label(address(SUMMERFI_GUARD), "AccountGuard");
    }

    /// @dev Whitelist RecipeExecutor in the AccountGuard
    function whitelistRecipeExecutor() internal {
        IAccountGuard accountGuard = IAccountGuard(SUMMERFI_GUARD);
        address guardOwner = accountGuard.owner();

        vm.prank(guardOwner);
        accountGuard.setWhitelist(address(recipeExecutor), true);

        assert(accountGuard.isWhitelisted(address(recipeExecutor)));
    }
}
