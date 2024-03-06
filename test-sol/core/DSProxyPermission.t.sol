// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import { DSProxyPermission } from "../../contracts/auth/DSProxyPermission.sol";
import { DSAuth } from "../../contracts/DS/DSAuth.sol";
import { DSAuthority } from "../../contracts/DS/DSAuthority.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";
import { Const } from "../Const.sol";

contract TestCore_DSProxyPermission is DSProxyPermission, BaseTest {
    
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    DSProxyPermission cut;

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
        walletAddr = wallet.createDSProxy();
        sender = wallet.owner();

        cut = new DSProxyPermission();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                     TESTS
    //////////////////////////////////////////////////////////////////////////*/
    function test_should_give_proxy_permission() public {
        address contractAddr = address(0x111);
        _give_proxy_permission(contractAddr);
        assertTrue(_address_has_proxy_permission(contractAddr));
    }

    function test_should_remove_proxy_permission() public {
        address contractAddr = address(0x111);
        _give_proxy_permission(contractAddr);
        _remove_proxy_permission(contractAddr);
        assertFalse(_address_has_proxy_permission(contractAddr));
    }

    function test_remove_proxy_permission_when_there_is_no_permission() public {
        address contractAddr = address(0x111);
        _remove_proxy_permission(contractAddr);
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      HELPERS
    //////////////////////////////////////////////////////////////////////////*/
    function _give_proxy_permission(address _addr) internal {
        bytes memory _calldata = abi.encodeWithSelector(DSProxyPermission.giveProxyPermission.selector, _addr);
        wallet.execute(address(cut), _calldata, 0);
    }

    function _remove_proxy_permission(address _addr) internal {
        bytes memory _calldata = abi.encodeWithSelector(DSProxyPermission.removeProxyPermission.selector, _addr);
        wallet.execute(address(cut), _calldata, 0);
    }

    function _address_has_proxy_permission(address _addr) internal view returns (bool) {
        DSAuthority authority = DSAuthority(DSAuth(walletAddr).authority());
        return authority.canCall(_addr, walletAddr, EXECUTE_SELECTOR);
    }
}
