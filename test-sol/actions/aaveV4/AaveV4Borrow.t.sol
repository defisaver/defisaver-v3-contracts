// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { AaveV4Borrow } from "../../../contracts/actions/aaveV4/AaveV4Borrow.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";
import { console2 } from "forge-std/console2.sol";

contract TestAaveV4Borrow is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4Borrow cut;

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

        cut = new AaveV4Borrow();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_borrow() public {
        bool isDirect = false;
        _baseTest(isDirect);
    }

    function test_borrow_direct() public {
        bool isDirect = true;
        _baseTest(isDirect);
    }

    function _baseTest(bool _isDirect) internal {
        AaveV4TestPair[] memory tests = getTestPairs();
        for (uint256 i = 0; i < tests.length; ++i) {
            uint256 snapshotId = vm.snapshotState();

            AaveV4TestPair memory testPair = tests[i];

            uint256 supplyAmountUsd = 1000;

            // Supply collateral first
            if (!_executeAaveV4Supply(testPair, supplyAmountUsd, sender, wallet)) {
                console2.log("Failed to supply assets. Check caps and reserve/spoke status.");
                continue;
            }

            uint256 borrowAmountUsd = 100;
            _borrow(testPair.spoke, testPair.debtReserveId, borrowAmountUsd, _isDirect);

            vm.revertToState(snapshotId);
        }
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _borrow(address _spoke, uint256 _reserveId, uint256 _amountUsd, bool _isDirect)
        internal
    {
        ISpoke.Reserve memory reserve = ISpoke(_spoke).getReserve(_reserveId);
        address underlying = reserve.underlying;
        uint256 borrowAmount = amountInUSDPrice(underlying, _amountUsd);

        if (!_isValidBorrow(_spoke, borrowAmount, reserve)) {
            console2.log("Invalid borrow. Check caps and reserve/spoke status.");
            return;
        }

        bytes memory executeActionCallData = executeActionCalldata(
            aaveV4BorrowEncode(_spoke, walletAddr, sender, _reserveId, borrowAmount), _isDirect
        );

        uint256 senderBalanceBefore = balanceOf(underlying, sender);
        uint256 positionDebtBefore = ISpoke(_spoke).getUserTotalDebt(_reserveId, walletAddr);

        wallet.execute(address(cut), executeActionCallData, 0);

        uint256 walletBalanceAfter = balanceOf(underlying, walletAddr);
        uint256 senderBalanceAfter = balanceOf(underlying, sender);
        uint256 positionDebtAfter = ISpoke(_spoke).getUserTotalDebt(_reserveId, walletAddr);

        assertEq(walletBalanceAfter, 0);
        assertApproxEqAbs(senderBalanceAfter, senderBalanceBefore + borrowAmount, 1);
        assertApproxEqAbs(positionDebtAfter, positionDebtBefore + borrowAmount, 1);
    }
}

