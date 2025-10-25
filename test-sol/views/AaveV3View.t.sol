// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IDebtToken } from "../../contracts/interfaces/protocols/aaveV3/IDebtToken.sol";
import { IPoolV3 } from "../../contracts/interfaces/protocols/aaveV3/IPoolV3.sol";
import { IERC20 } from "../../contracts/interfaces/token/IERC20.sol";
import { DataTypes } from "../../contracts/interfaces/protocols/aaveV3/DataTypes.sol";
import { SafeERC20 } from "../../contracts/utils/SafeERC20.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { ActionsUtils } from "../utils/ActionsUtils.sol";
import { Addresses } from "../utils/Addresses.sol";
import { AaveV3Supply } from "../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { AaveV3Borrow } from "../../contracts/actions/aaveV3/AaveV3Borrow.sol";

import { AaveV3View } from "../../contracts/views/AaveV3View.sol";
import { AaveV3Helper } from "../../contracts/actions/aaveV3/helpers/AaveV3Helper.sol";

contract TestAaveV3View is BaseTest, ActionsUtils, AaveV3Helper {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV3View cut;
    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    IPoolV3 lendingPool;

    AaveV3Supply supplyContract;
    AaveV3Borrow borrowContract;

    struct TestConfig {
        address supplyToken;
        address borrowToken;
        uint256 supplyAmount;
        uint256 borrowAmount;
        uint256 initialBalance;
    }

    TestConfig[] internal testConfigs;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV3View();

        _initializeTestConfigs();

        lendingPool = getLendingPool(DEFAULT_AAVE_MARKET);

        supplyContract = new AaveV3Supply();
        borrowContract = new AaveV3Borrow();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_Approvals_WithoutPosition() public view {
        DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(Addresses.WETH_ADDR);

        AaveV3View.EOAApprovalData memory approvals =
            cut.getEOAApprovalsAndBalances(Addresses.WETH_ADDR, sender, walletAddr, DEFAULT_AAVE_MARKET);

        assertEq(approvals.asset, Addresses.WETH_ADDR);
        assertEq(approvals.aToken, reserveData.aTokenAddress);
        assertEq(approvals.variableDebtToken, reserveData.variableDebtTokenAddress);
        assertEq(approvals.assetApproval, 0);
        assertEq(approvals.aTokenApproval, 0);
        assertEq(approvals.variableDebtDelegation, 0);
        assertEq(approvals.eoaBalance, 0);
        assertEq(approvals.borrowedVariableAmount, 0);
        assertEq(approvals.aTokenBalance, 0);
    }

    function test_Approvals_AfterOpeningPosition_Proxy() public {
        for (uint256 i = 0; i < testConfigs.length; i++) {
            uint256 snapshot = vm.snapshotState();
            _baseTestProxy(testConfigs[i]);
            vm.revertToState(snapshot);
        }
    }

    function _baseTestProxy(TestConfig memory config) internal {
        // Give initial balance for supply token
        give(config.supplyToken, sender, config.initialBalance);

        vm.startPrank(sender);
        SafeERC20.safeApprove(IERC20(config.supplyToken), walletAddr, type(uint256).max);
        vm.stopPrank();

        _createAaveV3Position(false, config);

        AaveV3View.EOAApprovalData memory approvals =
            cut.getEOAApprovalsAndBalances(config.supplyToken, sender, walletAddr, DEFAULT_AAVE_MARKET);

        bool isWBTC = Addresses.WBTC_ADDR == config.supplyToken;

        DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(config.supplyToken);
        assertEq(approvals.asset, config.supplyToken);
        assertEq(approvals.aToken, reserveData.aTokenAddress);
        assertEq(approvals.variableDebtToken, reserveData.variableDebtTokenAddress);
        assertEq(approvals.assetApproval, type(uint256).max - (isWBTC ? config.supplyAmount : 0)); // WBTC allowance is being decreased when used, even when it is UINT_MAX approval

        assertEq(approvals.aTokenApproval, 0);
        assertEq(approvals.variableDebtDelegation, 0);
        assertEq(approvals.eoaBalance, config.initialBalance - config.supplyAmount);
        assertEq(approvals.borrowedVariableAmount, 0);
        assertEq(approvals.aTokenBalance, 0);
    }

    function test_Approvals_AfterOpeningPosition_EOA() public {
        for (uint256 i = 0; i < testConfigs.length; i++) {
            uint256 snapshot = vm.snapshotState();
            _baseTest(testConfigs[i]);
            vm.revertToState(snapshot);
        }
    }

    function _baseTest(TestConfig memory config) internal {
        // Give initial balance for supply token
        give(config.supplyToken, sender, config.initialBalance);

        DataTypes.ReserveData memory reserveData = lendingPool.getReserveData(config.supplyToken);
        DataTypes.ReserveData memory reserveDataDebt = lendingPool.getReserveData(config.borrowToken);

        vm.startPrank(sender);
        SafeERC20.safeApprove(IERC20(config.supplyToken), walletAddr, type(uint256).max);
        SafeERC20.safeApprove(IERC20(reserveData.aTokenAddress), walletAddr, type(uint256).max);
        IDebtToken(reserveDataDebt.variableDebtTokenAddress).approveDelegation(walletAddr, type(uint256).max);
        vm.stopPrank();

        _createAaveV3Position(true, config);

        // Test supply token approvals
        AaveV3View.EOAApprovalData memory approvals =
            cut.getEOAApprovalsAndBalances(config.supplyToken, sender, walletAddr, DEFAULT_AAVE_MARKET);

        bool isWBTC = Addresses.WBTC_ADDR == config.supplyToken;
        assertEq(approvals.asset, config.supplyToken);
        assertEq(approvals.aToken, reserveData.aTokenAddress);
        assertEq(approvals.variableDebtToken, reserveData.variableDebtTokenAddress);
        assertEq(approvals.assetApproval, type(uint256).max - (isWBTC ? config.supplyAmount : 0)); // WBTC allowance is being decreased when used, even when it is UINT_MAX approval
        assertEq(approvals.aTokenApproval, type(uint256).max);
        assertEq(approvals.variableDebtDelegation, 0);
        assertEq(approvals.eoaBalance, config.initialBalance - config.supplyAmount);
        assertEq(approvals.borrowedVariableAmount, 0);
        assertApproxEqAbs(approvals.aTokenBalance, config.supplyAmount, 2);

        // Test borrow token approvals
        AaveV3View.EOAApprovalData memory approvalsDebt =
            cut.getEOAApprovalsAndBalances(config.borrowToken, sender, walletAddr, DEFAULT_AAVE_MARKET);

        assertEq(approvalsDebt.asset, config.borrowToken);
        assertEq(approvalsDebt.aToken, reserveDataDebt.aTokenAddress);
        assertEq(approvalsDebt.variableDebtToken, reserveDataDebt.variableDebtTokenAddress);
        assertEq(approvalsDebt.assetApproval, 0);
        assertEq(approvalsDebt.aTokenApproval, 0);
        assertApproxEqAbs(approvalsDebt.variableDebtDelegation, type(uint256).max - config.borrowAmount, 2);
        assertEq(approvalsDebt.eoaBalance, config.borrowAmount);
        assertApproxEqAbs(approvalsDebt.borrowedVariableAmount, config.borrowAmount, 2);
        assertEq(approvalsDebt.aTokenBalance, 0);

        skip(365 days);

        AaveV3View.EOAApprovalData memory approvalsAfter =
            cut.getEOAApprovalsAndBalances(config.supplyToken, sender, walletAddr, DEFAULT_AAVE_MARKET);

        assertEq(approvalsAfter.asset, config.supplyToken);
        assertEq(approvalsAfter.aToken, reserveData.aTokenAddress);
        assertEq(approvalsAfter.variableDebtToken, reserveData.variableDebtTokenAddress);
        assertEq(approvalsAfter.assetApproval, type(uint256).max - (isWBTC ? config.supplyAmount : 0)); // WBTC allowance is being decreased when used, even when it is UINT_MAX approval
        assertEq(approvalsAfter.aTokenApproval, type(uint256).max);
        assertEq(approvalsAfter.variableDebtDelegation, 0);
        assertEq(approvalsAfter.eoaBalance, config.initialBalance - config.supplyAmount);
        assertEq(approvalsAfter.borrowedVariableAmount, 0);
        assertGt(approvalsAfter.aTokenBalance, config.supplyAmount);

        AaveV3View.EOAApprovalData memory approvalsDebtAfter =
            cut.getEOAApprovalsAndBalances(config.borrowToken, sender, walletAddr, DEFAULT_AAVE_MARKET);

        assertEq(approvalsDebtAfter.asset, config.borrowToken);
        assertEq(approvalsDebtAfter.aToken, reserveDataDebt.aTokenAddress);
        assertEq(approvalsDebtAfter.variableDebtToken, reserveDataDebt.variableDebtTokenAddress);
        assertEq(approvalsDebtAfter.assetApproval, 0);
        assertEq(approvalsDebtAfter.aTokenApproval, 0);
        assertApproxEqAbs(approvalsDebtAfter.variableDebtDelegation, type(uint256).max - config.borrowAmount, 2);
        assertEq(approvalsDebtAfter.eoaBalance, config.borrowAmount);
        assertGt(approvalsDebtAfter.borrowedVariableAmount, config.borrowAmount);
        assertEq(approvalsDebtAfter.aTokenBalance, 0);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _createAaveV3Position(bool _isEOA, TestConfig memory _config) internal {
        DataTypes.ReserveData memory reserveDataColl = lendingPool.getReserveData(_config.supplyToken);
        DataTypes.ReserveData memory reserveDataDebt = lendingPool.getReserveData(_config.borrowToken);

        // Execute Supply
        bytes memory supplyParams = aaveV3SupplyEncode(
            _config.supplyAmount,
            sender,
            reserveDataColl.id,
            false, // useDefaultMarket
            true, // useOnBehalf
            DEFAULT_AAVE_MARKET, // market (will use default)
            _isEOA ? sender : walletAddr
        );

        bytes memory supplyCalldata =
            abi.encodeWithSelector(bytes4(keccak256("executeActionDirect(bytes)")), supplyParams);
        wallet.execute(address(supplyContract), supplyCalldata, 0);

        // Execute Borrow
        bytes memory borrowParams = aaveV3BorrowEncode(
            _config.borrowAmount,
            sender,
            2, // rateMode (variable)
            reserveDataDebt.id,
            false, // useDefaultMarket
            true, // useOnBehalf
            DEFAULT_AAVE_MARKET, // market (will use default)
            _isEOA ? sender : walletAddr
        );
        bytes memory borrowCalldata =
            abi.encodeWithSelector(bytes4(keccak256("executeActionDirect(bytes)")), borrowParams);
        wallet.execute(address(borrowContract), borrowCalldata, 0);
    }

    function _initializeTestConfigs() internal {
        // WETH/USDT
        testConfigs.push(
            TestConfig({
                supplyToken: Addresses.WETH_ADDR,
                borrowToken: Addresses.USDT_ADDR,
                supplyAmount: 30e18, // 30 WETH
                borrowAmount: 50_000e6, // 50k USDT
                initialBalance: 100e18 // 100 WETH
            })
        );

        // WETH/USDC
        testConfigs.push(
            TestConfig({
                supplyToken: Addresses.WETH_ADDR,
                borrowToken: Addresses.USDC_ADDR,
                supplyAmount: 30e18, // 30 WETH
                borrowAmount: 50_000e6, // 50k USDC
                initialBalance: 100e18 // 100 WETH
            })
        );

        // WBTC/USDT
        testConfigs.push(
            TestConfig({
                supplyToken: Addresses.WBTC_ADDR,
                borrowToken: Addresses.USDT_ADDR,
                supplyAmount: 3e8, // 3 WBTC
                borrowAmount: 100_000e6, // 100k USDT
                initialBalance: 10e8 // 10 WBTC
            })
        );

        // WBTC/GHO
        testConfigs.push(
            TestConfig({
                supplyToken: Addresses.WBTC_ADDR,
                borrowToken: Addresses.GHO_TOKEN,
                supplyAmount: 3e8, // 3 WBTC
                borrowAmount: 100_000e8, // 100k GHO
                initialBalance: 10e8 // 10 WBTC
            })
        );

        // USDT/WETH
        testConfigs.push(
            TestConfig({
                supplyToken: Addresses.USDT_ADDR,
                borrowToken: Addresses.WETH_ADDR,
                supplyAmount: 75_000e6, // 75k USDT
                borrowAmount: 5e18, // 5 WETH
                initialBalance: 1_000_000e6 // 1M USDT
            })
        );

        // // GHO/WETH
        // testConfigs.push(
        //     TestConfig({
        //         supplyToken: Addresses.GHO_TOKEN,
        //         borrowToken: Addresses.WETH_ADDR,
        //         supplyAmount: 7_500e18, // 7500 GHO
        //         borrowAmount: 5e17, // 0.5 WETH
        //         initialBalance: 1_000_000e18 // 1M GHO
        //     })
        // );

        // DAI/WBTC
        testConfigs.push(
            TestConfig({
                supplyToken: Addresses.DAI_ADDR,
                borrowToken: Addresses.WBTC_ADDR,
                supplyAmount: 300_000e18, // 300k DAI
                borrowAmount: 1e8, // 1 WBTC
                initialBalance: 500_000e18 // 500k DAI
            })
        );
    }
}
