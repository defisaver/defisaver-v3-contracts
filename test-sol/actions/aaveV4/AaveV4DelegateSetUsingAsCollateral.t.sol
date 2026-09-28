// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IConfigPositionManager
} from "../../../contracts/interfaces/protocols/aaveV4/IConfigPositionManager.sol";
import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import {
    AaveV4DelegateSetUsingAsCollateral
} from "../../../contracts/actions/aaveV4/AaveV4DelegateSetUsingAsCollateral.sol";
import { AaveV4Encode } from "test-sol/utils/encode/AaveV4Encode.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";

contract TestAaveV4DelegateSetUsingAsCollateral is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4DelegateSetUsingAsCollateral cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address delegatee;
    IConfigPositionManager configPM;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        delegatee = vm.addr(SIGNER_PK);
        wallet = new SmartWallet(delegatee);
        walletAddr = wallet.walletAddr();

        cut = new AaveV4DelegateSetUsingAsCollateral();
        configPM = IConfigPositionManager(CONFIG_POSITION_MANAGER);

        vm.prank(walletAddr);
        ISpoke(CORE_SPOKE).setUserPositionManager(CONFIG_POSITION_MANAGER, true);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_delegate_set_using_as_collateral_permission_true() public {
        assertFalse(
            configPM.getConfigPermissions(CORE_SPOKE, delegatee, walletAddr).canSetUsingAsCollateral
        );

        _executeDelegateSetUsingAsCollateral(true, false);

        assertTrue(
            configPM.getConfigPermissions(CORE_SPOKE, delegatee, walletAddr).canSetUsingAsCollateral
        );
    }

    function test_delegate_set_using_as_collateral_permission_false() public {
        _executeDelegateSetUsingAsCollateral(true, false);
        assertTrue(
            configPM.getConfigPermissions(CORE_SPOKE, delegatee, walletAddr).canSetUsingAsCollateral
        );

        _executeDelegateSetUsingAsCollateral(false, false);

        assertFalse(
            configPM.getConfigPermissions(CORE_SPOKE, delegatee, walletAddr).canSetUsingAsCollateral
        );
    }

    function test_delegate_set_using_as_collateral_permission_updates() public {
        _executeDelegateSetUsingAsCollateral(true, false);
        assertTrue(
            configPM.getConfigPermissions(CORE_SPOKE, delegatee, walletAddr).canSetUsingAsCollateral
        );

        _executeDelegateSetUsingAsCollateral(false, false);
        assertFalse(
            configPM.getConfigPermissions(CORE_SPOKE, delegatee, walletAddr).canSetUsingAsCollateral
        );

        _executeDelegateSetUsingAsCollateral(true, false);
        assertTrue(
            configPM.getConfigPermissions(CORE_SPOKE, delegatee, walletAddr).canSetUsingAsCollateral
        );
    }

    function test_delegate_set_using_as_collateral_direct() public {
        _executeDelegateSetUsingAsCollateral(true, true);

        assertTrue(
            configPM.getConfigPermissions(CORE_SPOKE, delegatee, walletAddr).canSetUsingAsCollateral
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _executeDelegateSetUsingAsCollateral(bool _permission, bool _isDirect) internal {
        bytes memory callData = executeActionCalldata(
            AaveV4Encode.delegateSetUsingAsCollateral(CORE_SPOKE, delegatee, _permission), _isDirect
        );

        wallet.execute(address(cut), callData, 0);
    }
}
