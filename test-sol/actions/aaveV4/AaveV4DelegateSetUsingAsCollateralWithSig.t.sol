// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IConfigPositionManager
} from "../../../contracts/interfaces/protocols/aaveV4/IConfigPositionManager.sol";
import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import {
    AaveV4DelegateSetUsingAsCollateralWithSig
} from "../../../contracts/actions/aaveV4/AaveV4DelegateSetUsingAsCollateralWithSig.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";

contract TestAaveV4DelegateSetUsingAsCollateralWithSig is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4DelegateSetUsingAsCollateralWithSig cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    IConfigPositionManager configPM;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkAaveV4DevNet();

        sender = vm.addr(SIGNER_PK);
        wallet = new SmartWallet(sender);
        walletAddr = wallet.walletAddr();

        cut = new AaveV4DelegateSetUsingAsCollateralWithSig();
        configPM = IConfigPositionManager(CONFIG_POSITION_MANAGER);

        vm.prank(sender);
        ISpoke(CORE_SPOKE).setUserPositionManager(CONFIG_POSITION_MANAGER, true);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_delegate_set_using_as_collateral_permission_true() public {
        assertFalse(
            configPM.getConfigPermissions(CORE_SPOKE, walletAddr, sender).canSetUsingAsCollateral
        );
        _executeDelegateSetUsingAsCollateralWithSig(true);
        assertTrue(
            configPM.getConfigPermissions(CORE_SPOKE, walletAddr, sender).canSetUsingAsCollateral
        );
    }

    function test_delegate_set_using_as_collateral_permission_false() public {
        _executeDelegateSetUsingAsCollateralWithSig(true);
        assertTrue(
            configPM.getConfigPermissions(CORE_SPOKE, walletAddr, sender).canSetUsingAsCollateral
        );
        _executeDelegateSetUsingAsCollateralWithSig(false);
        assertFalse(
            configPM.getConfigPermissions(CORE_SPOKE, walletAddr, sender).canSetUsingAsCollateral
        );
    }

    function test_delegate_set_using_as_collateral_permission_updates() public {
        _executeDelegateSetUsingAsCollateralWithSig(true);
        assertTrue(
            configPM.getConfigPermissions(CORE_SPOKE, walletAddr, sender).canSetUsingAsCollateral
        );
        _executeDelegateSetUsingAsCollateralWithSig(false);
        assertFalse(
            configPM.getConfigPermissions(CORE_SPOKE, walletAddr, sender).canSetUsingAsCollateral
        );
        _executeDelegateSetUsingAsCollateralWithSig(true);
        assertTrue(
            configPM.getConfigPermissions(CORE_SPOKE, walletAddr, sender).canSetUsingAsCollateral
        );
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _executeDelegateSetUsingAsCollateralWithSig(bool _permission) internal {
        uint256 nonce = configPM.nonces(sender, 1);
        uint256 deadline = block.timestamp + 1 hours;

        IConfigPositionManager.SetCanSetUsingAsCollateralPermissionPermit memory permit =
            IConfigPositionManager.SetCanSetUsingAsCollateralPermissionPermit({
                spoke: CORE_SPOKE,
                delegator: sender,
                delegatee: walletAddr,
                permission: _permission,
                nonce: nonce,
                deadline: deadline
            });

        bytes memory signature = _signSetUsingAsCollateralPermissionPermit(permit);

        AaveV4DelegateSetUsingAsCollateralWithSig.Params memory params =
            AaveV4DelegateSetUsingAsCollateralWithSig.Params({
                permit: permit, signature: signature
            });

        bytes memory callData =
            abi.encodeWithSelector(cut.executeActionDirect.selector, abi.encode(params));

        wallet.execute(address(cut), callData, 0);
    }

    function _signSetUsingAsCollateralPermissionPermit(
        IConfigPositionManager.SetCanSetUsingAsCollateralPermissionPermit memory _permit
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(
            abi.encode(
                configPM.SET_CAN_SET_USING_AS_COLLATERAL_PERMISSION_PERMIT_TYPEHASH(),
                _permit.spoke,
                _permit.delegator,
                _permit.delegatee,
                _permit.permission,
                _permit.nonce,
                _permit.deadline
            )
        );
        bytes32 digest =
            keccak256(abi.encodePacked("\x19\x01", configPM.DOMAIN_SEPARATOR(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PK, digest);
        return abi.encodePacked(r, s, v);
    }
}
