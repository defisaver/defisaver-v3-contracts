// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
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
        bool useAsCollateral = true;
        bool isDirect = false;
        bool takeMaxUint256 = false;

        _baseTest(useAsCollateral, isDirect, takeMaxUint256);
    }

    function test_supply_maxUint256() public {
        bool useAsCollateral = false;
        bool isDirect = false;
        bool takeMaxUint256 = true;

        _baseTest(useAsCollateral, isDirect, takeMaxUint256);
    }

    function test_supply_direct() public {
        bool useAsCollateral = false;
        bool isDirect = true;
        bool takeMaxUint256 = false;

        _baseTest(useAsCollateral, isDirect, takeMaxUint256);
    }

    function _baseTest(bool _useAsCollateral, bool _isDirect, bool _takeMaxUint256) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];
            _supply(testPair, _useAsCollateral, _isDirect, _takeMaxUint256);

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _supply(
        AaveV4TestPair memory _testPair,
        bool _useAsCollateral,
        bool _isDirect,
        bool _takeMaxUint256
    ) internal {
        ISpoke.Reserve memory reserve = ISpoke(_testPair.spoke).getReserve(_testPair.collReserveId);
        address underlying = reserve.underlying;
        uint256 supplyAmount = amountInUSDPrice(underlying, 10);

        if (!_isValidSupply(_testPair.spoke, supplyAmount, reserve)) return;

        give(underlying, sender, supplyAmount);
        approveAsSender(sender, underlying, walletAddr, supplyAmount);

        bytes memory executeActionCallData = executeActionCalldata(
            aaveV4SupplyEncode(
                _testPair.spoke,
                walletAddr,
                sender,
                _testPair.collReserveId,
                _takeMaxUint256 ? type(uint256).max : supplyAmount,
                _useAsCollateral
            ),
            _isDirect
        );

        // Before.
        uint256 senderBalanceBefore = balanceOf(underlying, sender);
        uint256 walletBalanceBefore = balanceOf(underlying, walletAddr);
        uint256 positionSuppliedAssetsBefore =
            ISpoke(_testPair.spoke).getUserSuppliedAssets(_testPair.collReserveId, walletAddr);
        assertEq(walletBalanceBefore, 0);
        assertEq(positionSuppliedAssetsBefore, 0);

        // Execute.
        wallet.execute(address(cut), executeActionCallData, 0);

        // After.
        uint256 senderBalanceAfter = balanceOf(underlying, sender);
        uint256 walletBalanceAfter = balanceOf(underlying, walletAddr);
        uint256 positionSuppliedAssetsAfter =
            ISpoke(_testPair.spoke).getUserSuppliedAssets(_testPair.collReserveId, walletAddr);

        // Assert.
        assertEq(walletBalanceAfter, 0);
        assertEq(senderBalanceAfter, senderBalanceBefore - supplyAmount);
        assertApproxEqAbs(positionSuppliedAssetsAfter, supplyAmount, 1);

        ISpoke.UserAccountData memory userAccountData =
            ISpoke(_testPair.spoke).getUserAccountData(walletAddr);
        assertEq(userAccountData.activeCollateralCount, _useAsCollateral ? 1 : 0);
    }
}
