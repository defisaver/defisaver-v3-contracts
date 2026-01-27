// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { AaveV4Withdraw } from "../../../contracts/actions/aaveV4/AaveV4Withdraw.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";
import { console2 } from "forge-std/console2.sol";

contract TestAaveV4Withdraw is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4Withdraw cut;

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

        cut = new AaveV4Withdraw();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_withdraw_part_of_collateral() public {
        bool isDirect = false;
        bool takeMaxUint256 = false;
        _baseTest(isDirect, takeMaxUint256);
    }

    function test_withdraw_all_collateral() public {
        bool isDirect = true;
        bool takeMaxUint256 = true;
        _baseTest(isDirect, takeMaxUint256);
    }

    function _baseTest(bool _isDirect, bool _takeMaxUint256) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];

            uint256 supplyAmountUsd = 10;

            if (!_executeAaveV4Supply(testPair, supplyAmountUsd, sender, wallet)) {
                console2.log("Failed to supply assets. Check caps and reserve/spoke status.");
                continue;
            }

            _withdraw(testPair.spoke, testPair.collReserveId, _isDirect, _takeMaxUint256);

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _withdraw(address _spoke, uint256 _reserveId, bool _isDirect, bool _takeMaxUint256)
        internal
    {
        address underlying = ISpoke(_spoke).getReserve(_reserveId).underlying;
        uint256 positionSuppliedAssets =
            ISpoke(_spoke).getUserSuppliedAssets(_reserveId, walletAddr);
        uint256 withdrawAmount =
            _takeMaxUint256 ? positionSuppliedAssets : positionSuppliedAssets / 2;
        bytes memory executeActionCallData = executeActionCalldata(
            aaveV4WithdrawEncode(
                _spoke,
                walletAddr,
                sender,
                _reserveId,
                _takeMaxUint256 ? type(uint256).max : withdrawAmount
            ),
            _isDirect
        );

        uint256 senderBalanceBefore = balanceOf(underlying, sender);

        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 senderBalanceAfter = balanceOf(underlying, sender);
        uint256 walletBalanceAfter = balanceOf(underlying, walletAddr);
        uint256 positionSuppliedAssetsAfter =
            ISpoke(_spoke).getUserSuppliedAssets(_reserveId, walletAddr);

        if (_takeMaxUint256) {
            assertEq(walletBalanceAfter, 0);
            assertApproxEqAbs(senderBalanceAfter, senderBalanceBefore + withdrawAmount, 1);
            assertEq(positionSuppliedAssetsAfter, 0);
        } else {
            assertEq(walletBalanceAfter, 0);
            assertApproxEqAbs(senderBalanceAfter, senderBalanceBefore + withdrawAmount, 1);
            assertApproxEqAbs(positionSuppliedAssetsAfter, withdrawAmount, 1);
        }
    }
}
