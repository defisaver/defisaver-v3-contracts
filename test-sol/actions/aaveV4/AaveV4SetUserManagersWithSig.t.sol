// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import {
    AaveV4SetUserManagersWithSig
} from "../../../contracts/actions/aaveV4/AaveV4SetUserManagersWithSig.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";

contract AaveV4SetUserManagersWithSigTest is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4SetUserManagersWithSig cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    address sender;
    ISpoke spoke;

    string constant SET_USER_POSITION_MANAGERS_TYPE = "SetUserPositionManagers(address onBehalfOf,PositionManagerUpdate[] updates,uint256 nonce,uint256 deadline)"
        "PositionManagerUpdate(address positionManager,bool approve)";

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkAaveV4DevNet();

        sender = vm.addr(SIGNER_PK);
        wallet = new SmartWallet(sender);
        walletAddr = wallet.walletAddr();

        cut = new AaveV4SetUserManagersWithSig();
        spoke = ISpoke(CORE_SPOKE);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_approve_single_manager() public {
        ISpoke.PositionManagerUpdate[] memory updates = _singleUpdate(GIVER_POSITION_MANAGER, true);
        assertFalse(spoke.isPositionManager(sender, GIVER_POSITION_MANAGER));
        _executeSetManagersWithSig(updates);
        assertTrue(spoke.isPositionManager(sender, GIVER_POSITION_MANAGER));
    }

    function test_approve_multiple_managers() public {
        ISpoke.PositionManagerUpdate[] memory updates = new ISpoke.PositionManagerUpdate[](3);
        updates[0] = ISpoke.PositionManagerUpdate(GIVER_POSITION_MANAGER, true);
        updates[1] = ISpoke.PositionManagerUpdate(TAKER_POSITION_MANAGER, true);
        _executeSetManagersWithSig(updates);
        assertTrue(spoke.isPositionManager(sender, GIVER_POSITION_MANAGER));
        assertTrue(spoke.isPositionManager(sender, TAKER_POSITION_MANAGER));
    }

    function test_revoke_single_manager() public {
        _executeSetManagersWithSig(_singleUpdate(GIVER_POSITION_MANAGER, true));
        assertTrue(spoke.isPositionManager(sender, GIVER_POSITION_MANAGER));
        _executeSetManagersWithSig(_singleUpdate(GIVER_POSITION_MANAGER, false));
        assertFalse(spoke.isPositionManager(sender, GIVER_POSITION_MANAGER));
    }

    function test_approve_already_approved_manager() public {
        _executeSetManagersWithSig(_singleUpdate(GIVER_POSITION_MANAGER, true));
        assertTrue(spoke.isPositionManager(sender, GIVER_POSITION_MANAGER));
        _executeSetManagersWithSig(_singleUpdate(GIVER_POSITION_MANAGER, true));
        assertTrue(spoke.isPositionManager(sender, GIVER_POSITION_MANAGER));
    }

    function test_revoke_not_approved_manager() public {
        assertFalse(spoke.isPositionManager(sender, GIVER_POSITION_MANAGER));
        _executeSetManagersWithSig(_singleUpdate(GIVER_POSITION_MANAGER, false));
        assertFalse(spoke.isPositionManager(sender, GIVER_POSITION_MANAGER));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _executeSetManagersWithSig(ISpoke.PositionManagerUpdate[] memory _updates) internal {
        uint256 nonce = spoke.nonces(sender, 0);
        uint256 deadline = block.timestamp + 1 hours;

        bytes memory signature = _signSetManagersIntent(sender, _updates, nonce, deadline);

        AaveV4SetUserManagersWithSig.Params memory params = AaveV4SetUserManagersWithSig.Params({
            spoke: CORE_SPOKE,
            onBehalf: sender,
            nonce: nonce,
            deadline: deadline,
            signature: signature,
            updates: _updates
        });

        bytes memory callData =
            abi.encodeWithSelector(cut.executeActionDirect.selector, abi.encode(params));

        wallet.execute(address(cut), callData, 0);
    }

    function _signSetManagersIntent(
        address _onBehalfOf,
        ISpoke.PositionManagerUpdate[] memory _updates,
        uint256 _nonce,
        uint256 _deadline
    ) internal view returns (bytes memory) {
        ISpoke.SetUserPositionManagers memory data = ISpoke.SetUserPositionManagers({
            onBehalfOf: _onBehalfOf, updates: _updates, nonce: _nonce, deadline: _deadline
        });

        bytes32 structHash = vm.eip712HashStruct(SET_USER_POSITION_MANAGERS_TYPE, abi.encode(data));
        bytes32 digest =
            keccak256(abi.encodePacked("\x19\x01", spoke.DOMAIN_SEPARATOR(), structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(SIGNER_PK, digest);
        return abi.encodePacked(r, s, v);
    }

    function _singleUpdate(address _positionManager, bool _approve)
        internal
        pure
        returns (ISpoke.PositionManagerUpdate[] memory updates)
    {
        updates = new ISpoke.PositionManagerUpdate[](1);
        updates[0] = ISpoke.PositionManagerUpdate(_positionManager, _approve);
    }
}
