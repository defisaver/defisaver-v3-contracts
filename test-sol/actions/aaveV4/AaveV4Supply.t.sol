// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import {
    IConfigPositionManager
} from "../../../contracts/interfaces/protocols/aaveV4/IConfigPositionManager.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { AaveV4Supply } from "../../../contracts/actions/aaveV4/AaveV4Supply.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";

contract TestAaveV4Supply is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4Supply cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;

    struct TestConfig {
        bool useAsCollateral;
        bool isDirect;
        bool takeMaxUint256;
        bool isEoa;
    }

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkAaveV4DevNet();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new AaveV4Supply();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_supply_useAsCollateral() public {
        _baseTest(
            TestConfig({
                useAsCollateral: true, isDirect: false, takeMaxUint256: false, isEoa: false
            })
        );
    }

    function test_supply_maxUint256() public {
        _baseTest(
            TestConfig({
                useAsCollateral: false, isDirect: false, takeMaxUint256: true, isEoa: false
            })
        );
    }

    function test_supply_direct() public {
        _baseTest(
            TestConfig({
                useAsCollateral: false, isDirect: true, takeMaxUint256: false, isEoa: false
            })
        );
    }

    function test_supply_useAsCollateral_eoa() public {
        _baseTest(
            TestConfig({
                useAsCollateral: true, isDirect: false, takeMaxUint256: false, isEoa: true
            })
        );
    }

    function test_supply_maxUint256_eoa() public {
        _baseTest(
            TestConfig({
                useAsCollateral: false, isDirect: false, takeMaxUint256: true, isEoa: true
            })
        );
    }

    function test_supply_direct_eoa() public {
        _baseTest(
            TestConfig({
                useAsCollateral: false, isDirect: true, takeMaxUint256: false, isEoa: true
            })
        );
    }

    function _baseTest(TestConfig memory _testConfig) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];
            _supply(testPair, _testConfig);

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _supply(AaveV4TestPair memory _testPair, TestConfig memory _testConfig) internal {
        ISpoke spoke = ISpoke(_testPair.spoke);
        ISpoke.Reserve memory reserve = spoke.getReserve(_testPair.collReserveId);
        uint256 supplyAmount = _amountInUSDPrice(_testPair.spoke, _testPair.collReserveId, 10);

        if (!_isValidSupply(_testPair.spoke, supplyAmount, reserve)) return;

        address onBehalf = _testConfig.isEoa ? sender : walletAddr;

        if (_testConfig.isEoa) {
            _enablePositionManagersForEoa(spoke, onBehalf, _testConfig.useAsCollateral);
        }

        give(reserve.underlying, sender, supplyAmount);
        approveAsSender(sender, reserve.underlying, walletAddr, supplyAmount);

        bytes memory executeActionCallData = executeActionCalldata(
            aaveV4SupplyEncode(
                _testPair.spoke,
                onBehalf,
                sender,
                _testPair.collReserveId,
                _testConfig.takeMaxUint256 ? type(uint256).max : supplyAmount,
                _testConfig.useAsCollateral
            ),
            _testConfig.isDirect
        );

        // Before.
        uint256 senderBalanceBefore = balanceOf(reserve.underlying, sender);
        assertEq(balanceOf(reserve.underlying, walletAddr), 0);
        uint256 positionSuppliedAssetsBefore =
            spoke.getUserSuppliedAssets(_testPair.collReserveId, onBehalf);
        assertEq(positionSuppliedAssetsBefore, 0);

        // Execute.
        wallet.execute(address(cut), executeActionCallData, 0);

        // After.
        uint256 senderBalanceAfter = balanceOf(reserve.underlying, sender);
        uint256 positionSuppliedAssetsAfter =
            spoke.getUserSuppliedAssets(_testPair.collReserveId, onBehalf);

        // Assert.
        assertEq(senderBalanceAfter, senderBalanceBefore - supplyAmount);
        assertApproxEqAbs(positionSuppliedAssetsAfter, supplyAmount, 1);
        assertEq(balanceOf(reserve.underlying, walletAddr), 0);

        ISpoke.UserAccountData memory userAccountData = spoke.getUserAccountData(onBehalf);
        assertEq(userAccountData.activeCollateralCount, _testConfig.useAsCollateral ? 1 : 0);
    }

    function _enablePositionManagersForEoa(ISpoke _spoke, address _eoa, bool _useAsCollateral)
        internal
    {
        vm.startPrank(_eoa);
        _spoke.setUserPositionManager(SUPPLY_REPAY_POSITION_MANAGER, true);
        if (_useAsCollateral) {
            _spoke.setUserPositionManager(CONFIG_POSITION_MANAGER, true);
            IConfigPositionManager(CONFIG_POSITION_MANAGER)
                .setCanUpdateUsingAsCollateralPermission(address(_spoke), walletAddr, true);
        }
        vm.stopPrank();
    }
}
