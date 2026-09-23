// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    ITakerPositionManager
} from "../../../contracts/interfaces/protocols/aaveV4/ITakerPositionManager.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { AaveV4DelegateBorrow } from "../../../contracts/actions/aaveV4/AaveV4DelegateBorrow.sol";
import { AaveV4Encode } from "test-sol/utils/encode/AaveV4Encode.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";

contract TestAaveV4DelegateBorrow is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4DelegateBorrow cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address spender;
    ITakerPositionManager takerPM;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        spender = vm.addr(SIGNER_PK);
        wallet = new SmartWallet(spender);
        walletAddr = wallet.walletAddr();

        cut = new AaveV4DelegateBorrow();
        takerPM = ITakerPositionManager(TAKER_POSITION_MANAGER);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_delegate_borrow_specific_amount() public {
        uint256 amount = 1000e6;
        assertEq(takerPM.borrowAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, walletAddr, spender), 0);

        _executeDelegateBorrow(CORE_RESERVE_ID_USDC, amount, false);

        assertEq(
            takerPM.borrowAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, walletAddr, spender), amount
        );
    }

    function test_delegate_borrow_max_amount() public {
        _executeDelegateBorrow(CORE_RESERVE_ID_WETH, type(uint256).max, false);

        assertEq(
            takerPM.borrowAllowance(CORE_SPOKE, CORE_RESERVE_ID_WETH, walletAddr, spender),
            type(uint256).max
        );
    }

    function test_delegate_borrow_updates_allowance() public {
        _executeDelegateBorrow(CORE_RESERVE_ID_USDC, 500e6, false);
        assertEq(
            takerPM.borrowAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, walletAddr, spender), 500e6
        );

        _executeDelegateBorrow(CORE_RESERVE_ID_USDC, 1000e6, false);
        assertEq(
            takerPM.borrowAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, walletAddr, spender), 1000e6
        );
    }

    function test_delegate_borrow_direct() public {
        uint256 amount = 1000e6;

        _executeDelegateBorrow(CORE_RESERVE_ID_USDC, amount, true);

        assertEq(
            takerPM.borrowAllowance(CORE_SPOKE, CORE_RESERVE_ID_USDC, walletAddr, spender), amount
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _executeDelegateBorrow(uint256 _reserveId, uint256 _amount, bool _isDirect) internal {
        bytes memory callData = executeActionCalldata(
            AaveV4Encode.delegateBorrow(CORE_SPOKE, _reserveId, spender, _amount), _isDirect
        );

        wallet.execute(address(cut), callData, 0);
    }
}
