// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ISpoke } from "../../../contracts/interfaces/protocols/aaveV4/ISpoke.sol";
import { SmartWallet } from "test-sol/utils/SmartWallet.sol";
import { AaveV4SetUserManagers } from "../../../contracts/actions/aaveV4/AaveV4SetUserManagers.sol";
import { AaveV4Encode } from "test-sol/utils/encode/AaveV4Encode.sol";
import { AaveV4TestBase } from "./AaveV4TestBase.t.sol";

contract TestAaveV4SetUserManagers is AaveV4TestBase {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    AaveV4SetUserManagers cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/
    SmartWallet wallet;
    address walletAddr;
    ISpoke spoke;

    /*//////////////////////////////////////////////////////////////////////////
                                  SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkFromEnv("");

        wallet = new SmartWallet(bob);
        walletAddr = wallet.walletAddr();

        cut = new AaveV4SetUserManagers();
        spoke = ISpoke(CORE_SPOKE);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_approve_single_manager() public {
        assertFalse(spoke.isPositionManager(walletAddr, GIVER_POSITION_MANAGER));

        _executeSetManagers(_singleUpdate(GIVER_POSITION_MANAGER, true), false);

        assertTrue(spoke.isPositionManager(walletAddr, GIVER_POSITION_MANAGER));
    }

    function test_approve_multiple_managers() public {
        ISpoke.PositionManagerUpdate[] memory updates = new ISpoke.PositionManagerUpdate[](3);
        updates[0] = ISpoke.PositionManagerUpdate(GIVER_POSITION_MANAGER, true);
        updates[1] = ISpoke.PositionManagerUpdate(TAKER_POSITION_MANAGER, true);
        updates[2] = ISpoke.PositionManagerUpdate(CONFIG_POSITION_MANAGER, true);

        _executeSetManagers(updates, false);

        assertTrue(spoke.isPositionManager(walletAddr, GIVER_POSITION_MANAGER));
        assertTrue(spoke.isPositionManager(walletAddr, TAKER_POSITION_MANAGER));
        assertTrue(spoke.isPositionManager(walletAddr, CONFIG_POSITION_MANAGER));
    }

    function test_revoke_single_manager() public {
        _executeSetManagers(_singleUpdate(GIVER_POSITION_MANAGER, true), false);
        assertTrue(spoke.isPositionManager(walletAddr, GIVER_POSITION_MANAGER));

        _executeSetManagers(_singleUpdate(GIVER_POSITION_MANAGER, false), false);

        assertFalse(spoke.isPositionManager(walletAddr, GIVER_POSITION_MANAGER));
    }

    function test_approve_already_approved_manager() public {
        _executeSetManagers(_singleUpdate(GIVER_POSITION_MANAGER, true), false);
        assertTrue(spoke.isPositionManager(walletAddr, GIVER_POSITION_MANAGER));

        _executeSetManagers(_singleUpdate(GIVER_POSITION_MANAGER, true), false);

        assertTrue(spoke.isPositionManager(walletAddr, GIVER_POSITION_MANAGER));
    }

    function test_revoke_not_approved_manager() public {
        assertFalse(spoke.isPositionManager(walletAddr, GIVER_POSITION_MANAGER));

        _executeSetManagers(_singleUpdate(GIVER_POSITION_MANAGER, false), false);

        assertFalse(spoke.isPositionManager(walletAddr, GIVER_POSITION_MANAGER));
    }

    function test_set_user_managers_direct() public {
        _executeSetManagers(_singleUpdate(GIVER_POSITION_MANAGER, true), true);

        assertTrue(spoke.isPositionManager(walletAddr, GIVER_POSITION_MANAGER));
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _executeSetManagers(ISpoke.PositionManagerUpdate[] memory _updates, bool _isDirect)
        internal
    {
        bytes memory callData =
            executeActionCalldata(AaveV4Encode.setUserManagers(CORE_SPOKE, _updates), _isDirect);

        wallet.execute(address(cut), callData, 0);
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
