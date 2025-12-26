// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IERC20 } from "../../contracts/interfaces/token/IERC20.sol";
import { SafeERC20 } from "../../contracts/_vendor/openzeppelin/SafeERC20.sol";
import { ISparkPool } from "../../contracts/interfaces/protocols/spark/ISparkPool.sol";
import { SparkDataTypes } from "../../contracts/interfaces/protocols/spark/SparkDataTypes.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { ActionsUtils } from "../utils/ActionsUtils.sol";
import { Addresses } from "../utils/Addresses.sol";

import { SparkSupply } from "../../contracts/actions/spark/SparkSupply.sol";
import { SparkBorrow } from "../../contracts/actions/spark/SparkBorrow.sol";
import { SparkSetEMode } from "../../contracts/actions/spark/SparkSetEMode.sol";
import { SparkViewSmall } from "../../contracts/views/SparkViewSmall.sol";
import { SparkHelper } from "../../contracts/actions/spark/helpers/SparkHelper.sol";

contract TestSparkViewSmall is BaseTest, ActionsUtils, SparkHelper {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    SparkViewSmall cut;
    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    ISparkPool lendingPool;

    SparkSupply supplyContract;
    SparkBorrow borrowContract;
    SparkSetEMode setEModeContract;

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

        cut = new SparkViewSmall();

        _initializeTestConfigs();

        lendingPool = getSparkLendingPool(DEFAULT_SPARK_MARKET);

        supplyContract = new SparkSupply();
        borrowContract = new SparkBorrow();
        setEModeContract = new SparkSetEMode();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_NoPosition() public view {
        SparkViewSmall.MiniUserPositionData memory userPosition =
            cut.getMiniUserPositionData(DEFAULT_SPARK_MARKET, walletAddr);

        uint256 lengthOfTokens = lendingPool.getReservesList().length;
        assertEq(userPosition.currentEmodeId, 0);

        for (uint256 i = 0; i < lengthOfTokens; i++) {
            assertEq(userPosition.borrowAmounts[i], 0);
            assertEq(userPosition.isCollateral[i], false);
            assertEq(userPosition.supplyAmounts[i], 0);
        }
    }

    function test_MiniInfoUserPosition() public {
        for (uint256 i = 0; i < testConfigs.length; i++) {
            uint256 snapshot = vm.snapshotState();
            _baseTest(testConfigs[i]);
            vm.revertToState(snapshot);
        }
    }

    function test_WithEModeSelected() public {
        TestConfig memory _config = testConfigs[2];
        uint256 EMODE_ID = 2;

        // Give initial balance for supply token
        give(_config.supplyToken, sender, _config.initialBalance);

        vm.startPrank(sender);
        SafeERC20.safeApprove(IERC20(_config.supplyToken), walletAddr, type(uint256).max);
        vm.stopPrank();

        _createSparkPosition(_config);
        _setEMode(uint8(EMODE_ID), false, DEFAULT_SPARK_MARKET);

        SparkViewSmall.MiniUserPositionData memory userPosition =
            cut.getMiniUserPositionData(DEFAULT_SPARK_MARKET, walletAddr);

        assertEq(userPosition.currentEmodeId, EMODE_ID);

        uint256 lengthOfTokens = lendingPool.getReservesList().length;

        for (uint256 i = 0; i < lengthOfTokens; i++) {
            if (_config.supplyToken == userPosition.tokenAddresses[i]) {
                assertApproxEqAbs(_config.supplyAmount, userPosition.supplyAmounts[i], 1);
                assertEq(userPosition.isCollateral[i], true);
            }
            if (_config.borrowToken == userPosition.tokenAddresses[i]) {
                assertApproxEqAbs(_config.borrowAmount, userPosition.borrowAmounts[i], 1);
            }
        }
    }

    function test_SupplyWithoutCollateral() public {
        TestConfig memory _config = testConfigs[0];

        // Give initial balance for supply token
        give(_config.supplyToken, sender, _config.initialBalance);

        vm.startPrank(sender);
        SafeERC20.safeApprove(IERC20(_config.supplyToken), address(lendingPool), type(uint256).max);
        lendingPool.supply(_config.supplyToken, _config.supplyAmount, sender, 0);
        lendingPool.setUserUseReserveAsCollateral(_config.supplyToken, false);
        vm.stopPrank();

        SparkViewSmall.MiniUserPositionData memory userPosition =
            cut.getMiniUserPositionData(DEFAULT_SPARK_MARKET, sender);

        uint256 lengthOfTokens = lendingPool.getReservesList().length;

        for (uint256 i = 0; i < lengthOfTokens; i++) {
            assertEq(userPosition.isCollateral[i], false);

            if (_config.supplyToken == userPosition.tokenAddresses[i]) {
                assertApproxEqAbs(_config.supplyAmount, userPosition.supplyAmounts[i], 1);
            }
        }
    }

    function _baseTest(TestConfig memory _config) public {
        // Give initial balance for supply token
        give(_config.supplyToken, sender, _config.initialBalance);

        vm.startPrank(sender);
        SafeERC20.safeApprove(IERC20(_config.supplyToken), walletAddr, type(uint256).max);
        vm.stopPrank();

        _createSparkPosition(_config);

        SparkViewSmall.MiniUserPositionData memory userPosition =
            cut.getMiniUserPositionData(DEFAULT_SPARK_MARKET, walletAddr);

        uint256 lengthOfTokens = lendingPool.getReservesList().length;
        assertEq(userPosition.currentEmodeId, 0);

        for (uint256 i = 0; i < lengthOfTokens; i++) {
            if (_config.supplyToken == userPosition.tokenAddresses[i]) {
                assertApproxEqAbs(_config.supplyAmount, userPosition.supplyAmounts[i], 1);
                assertEq(userPosition.isCollateral[i], true);
            }
            if (_config.borrowToken == userPosition.tokenAddresses[i]) {
                assertApproxEqAbs(_config.borrowAmount, userPosition.borrowAmounts[i], 1);
            }
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/

    function _createSparkPosition(TestConfig memory _config) internal {
        SparkDataTypes.ReserveData memory reserveDataColl =
            lendingPool.getReserveData(_config.supplyToken);
        SparkDataTypes.ReserveData memory reserveDataDebt =
            lendingPool.getReserveData(_config.borrowToken);

        // Execute Supply
        bytes memory supplyParams = sparkSupplyEncode(
            _config.supplyAmount,
            sender,
            reserveDataColl.id,
            true,
            false, // useDefaultMarket
            true, // useOnBehalf
            DEFAULT_SPARK_MARKET, // market (will use default)
            walletAddr
        );

        bytes memory supplyCalldata =
            abi.encodeWithSelector(bytes4(keccak256("executeActionDirect(bytes)")), supplyParams);
        wallet.execute(address(supplyContract), supplyCalldata, 0);

        // Execute Borrow
        bytes memory borrowParams = sparkBorrowEncode(
            _config.borrowAmount,
            sender,
            2, // rateMode (variable)
            reserveDataDebt.id,
            false, // useDefaultMarket
            true, // useOnBehalf
            DEFAULT_SPARK_MARKET, // market (will use default)
            walletAddr
        );
        bytes memory borrowCalldata =
            abi.encodeWithSelector(bytes4(keccak256("executeActionDirect(bytes)")), borrowParams);
        wallet.execute(address(borrowContract), borrowCalldata, 0);
    }

    function _setEMode(uint8 _categoryId, bool _useDefaultMarket, address _market) internal {
        // Execute SparkSetEMode
        bytes memory setEModeParams = sparkSetEModeEncode(_categoryId, _useDefaultMarket, _market);

        bytes memory setEModeCalldata =
            abi.encodeWithSelector(bytes4(keccak256("executeActionDirect(bytes)")), setEModeParams);
        wallet.execute(address(setEModeContract), setEModeCalldata, 0);
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

        // sDAI/USDC
        testConfigs.push(
            TestConfig({
                supplyToken: Addresses.WETH_ADDR,
                borrowToken: Addresses.USDT_ADDR,
                supplyAmount: 80_000e18, // 30 sDAI
                borrowAmount: 50_000e6, // 50k USDC
                initialBalance: 100_000e18 // 100 sDAI
            })
        );
    }
}
