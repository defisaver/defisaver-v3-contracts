// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IEVC } from "../../../contracts/interfaces/eulerV2/IEVC.sol";
import { EulerV2TestHelper } from "./EulerV2TestHelper.t.sol";
import {EulerV2ControllerSwitch} from "../../../contracts/actions/eulerV2/EulerV2ControllerSwitch.sol";

import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestEulerV2ControllerSwitch is EulerV2TestHelper {
    
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    EulerV2ControllerSwitch cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address sender;
    address walletAddr;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnetLatest();

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new EulerV2ControllerSwitch();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_enable_controller_on_main_account() public revertToSnapshot {
        address account = walletAddr;
        address controllerVault = E_USDC_2_GOVERNED;
        bool enableAsController = true;
        bool isDirect = false;

        _baseTest(account, controllerVault, enableAsController, isDirect);
    }

    function test_should_disable_controller_on_default_account() public revertToSnapshot {
        address account = address(0);
        address controllerVault = E_USDC_2_GOVERNED;
        bool isDirect = false;

        _baseTest(account, controllerVault, true, isDirect);
        _baseTest(account, controllerVault, false, isDirect);
    }

    function test_should_enable_controller_with_action_direct() public revertToSnapshot {
        address account = walletAddr;
        address controllerVault = E_USDC_2_GOVERNED;
        bool enableAsController = true;
        bool isDirect = true;

        _baseTest(account, controllerVault, enableAsController, isDirect);
    }

    function test_should_enable_controller_on_virtual_account() public revertToSnapshot {
        address account = getVirtualAccount(walletAddr, 0x01);
        address controllerVault = E_USDC_2_GOVERNED;
        bool enableAsController = true;
        bool isDirect = true;

        _baseTest(account, controllerVault, enableAsController, isDirect);
    }

    function _baseTest(
        address _account,
        address _vault,
        bool _enableAsController,
        bool _isDirect
    ) internal {
        bytes memory executeActionCallData = executeActionCalldata(
            eulerV2ControllerSwitchEncode(
                _vault,
                _account,
                _enableAsController
            ),
            _isDirect
        );

        address account = _account == address(0) ? walletAddr : _account;

        wallet.execute(address(cut), executeActionCallData, 0);

        assertEq(IEVC(EVC_ADDR).isControllerEnabled(account, _vault), _enableAsController);
    }
}
