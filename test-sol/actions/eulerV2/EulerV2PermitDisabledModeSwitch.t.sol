// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IEVC } from "../../../contracts/interfaces/eulerV2/IEVC.sol";
import { EulerV2TestHelper } from "./EulerV2TestHelper.t.sol";
import {EulerV2PermitDisabledModeSwitch} from "../../../contracts/actions/eulerV2/EulerV2PermitDisabledModeSwitch.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestEulerV2PermitDisabledModeSwitch is EulerV2TestHelper {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2PermitDisabledModeSwitch cut;

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

        cut = new EulerV2PermitDisabledModeSwitch();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_switch_permitDisabled_mode() public {
        bool isActionDirect = false;
        _permitDisabledModeSwitch(true, isActionDirect);
        _permitDisabledModeSwitch(false, isActionDirect);
    }

    function test_should_switch_permitDisabled_mode_action_direct() public {
        bool isActionDirect = true;
        _permitDisabledModeSwitch(true, isActionDirect);
        _permitDisabledModeSwitch(false, isActionDirect);
    }

    function _permitDisabledModeSwitch(bool _enabled, bool _isDirect) internal {
        bytes memory executeActionCallData = executeActionCalldata(
            eulerV2PermitDisabledModeSwitch(_enabled),
            _isDirect
        );
        wallet.execute(address(cut), executeActionCallData, 0);
        assertEq(IEVC(EVC_ADDR).isPermitDisabledMode(getAddressPrefixInternal(walletAddr)), _enabled);
    }
}
