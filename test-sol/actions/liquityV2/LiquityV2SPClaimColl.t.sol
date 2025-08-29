// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";
import { LiquityV2SPClaimColl } from "../../../contracts/actions/liquityV2/stabilityPool/LiquityV2SPClaimColl.sol";

import { LiquityV2ExecuteActions } from "../../utils/executeActions/LiquityV2ExecuteActions.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestLiquityV2SPClaimColl is LiquityV2ExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2SPClaimColl cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IAddressesRegistry[] markets;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("LiquityV2SPClaimColl");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2SPClaimColl();

        markets = getMarkets();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_claim_coll() public {
        bool isDirect = false;
        _baseTest(isDirect);
    }

    function test_should_claim_coll_direct_action() public {
        bool isDirect = true;
        _baseTest(isDirect);
    }

    function _baseTest(bool _isDirect) public {
        for (uint256 i = 0; i < markets.length; i++) {
            _claim(markets[i], _isDirect);
        }
    }

    function _claim(IAddressesRegistry _market, bool _isDirect) internal {
        address collToken = _market.collToken();
        address stabilityPool = _market.stabilityPool();

        bytes memory executeActionCallData =
            executeActionCalldata(liquityV2SPClaimCollEncode(address(_market), sender), _isDirect);

        uint256 amountToClaim = 1000;
        _simulateClaimAmount(amountToClaim, stabilityPool, collToken);

        uint256 senderCollBalanceBefore = balanceOf(collToken, sender);
        wallet.execute(address(cut), executeActionCallData, 0);
        uint256 senderCollBalanceAfter = balanceOf(collToken, sender);

        assertEq(senderCollBalanceAfter, senderCollBalanceBefore + amountToClaim);
    }

    function _simulateClaimAmount(uint256 _amountToClaim, address _sp, address _collToken) internal {
        uint256 collBalanceStorageSlot = 3;
        uint256 stashedCollMappingSlot = 9;
        vm.store(_sp, bytes32(collBalanceStorageSlot), bytes32(_amountToClaim));
        vm.store(_sp, keccak256(abi.encode(walletAddr, stashedCollMappingSlot)), bytes32(_amountToClaim));
        give(_collToken, _sp, _amountToClaim * 2);
    }
}
