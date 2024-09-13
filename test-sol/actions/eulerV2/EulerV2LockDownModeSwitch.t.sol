// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IEVC } from "../../../contracts/interfaces/eulerV2/IEVC.sol";
import { EulerV2TestHelper } from "./EulerV2TestHelper.t.sol";
import {EulerV2LockDownModeSwitch} from "../../../contracts/actions/eulerV2/EulerV2LockDownModeSwitch.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestEulerV2LockDownModeSwitch is EulerV2TestHelper {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2LockDownModeSwitch cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        walletAddr = wallet.walletAddr();

        cut = new EulerV2LockDownModeSwitch();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_switch_lockdown_mode() public {
        bool isActionDirect = false;
        _lockDownModeSwitch(true, isActionDirect);
        _lockDownModeSwitch(false, isActionDirect);
    }

    function test_should_switch_lockdown_mode_action_direct() public {
        bool isActionDirect = true;
        _lockDownModeSwitch(true, isActionDirect);
        _lockDownModeSwitch(false, isActionDirect);
    }

    function _lockDownModeSwitch(bool _enabled, bool _isDirect) internal {
        bytes memory executeActionCallData = executeActionCalldata(
            eulerV2LockDownModeSwitchEncode(_enabled),
            _isDirect
        );
        wallet.execute(address(cut), executeActionCallData, 0);
        assertEq(IEVC(EVC_ADDR).isLockdownMode(getAddressPrefixInternal(walletAddr)), _enabled);
    }
}
