// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { MockDSProxyPermission } from "../../contracts/mocks/MockDSProxyPermission.sol";
import { IDSAuth } from "../../contracts/interfaces/DS/IDSAuth.sol";
import { IDSAuthority } from "../../contracts/interfaces/DS/IDSAuthority.sol";

import { BaseTest } from "../utils/BaseTest.sol";
import { SmartWallet } from "../utils/SmartWallet.sol";

contract TestCore_DSProxyPermission is MockDSProxyPermission, BaseTest {
    /*//////////////////////////////////////////////////////////////////////////
                               CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    MockDSProxyPermission cut;

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

        cut = new MockDSProxyPermission();
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
        bytes memory _calldata =
            abi.encodeWithSelector(MockDSProxyPermission.giveProxyPermission.selector, _addr);
        wallet.execute(address(cut), _calldata, 0);
    }

    function _remove_proxy_permission(address _addr) internal {
        bytes memory _calldata =
            abi.encodeWithSelector(MockDSProxyPermission.removeProxyPermission.selector, _addr);
        wallet.execute(address(cut), _calldata, 0);
    }

    function _address_has_proxy_permission(address _addr) internal view returns (bool) {
        IDSAuthority authority = IDSAuthority(IDSAuth(walletAddr).authority());
        return authority.canCall(_addr, walletAddr, EXECUTE_SELECTOR);
    }
}
