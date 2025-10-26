// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IAddressesRegistry
} from "../../../contracts/interfaces/protocols/liquityV2/IAddressesRegistry.sol";
import { ITroveManager } from "../../../contracts/interfaces/protocols/liquityV2/ITroveManager.sol";
import {
    ICollSurplusPool
} from "../../../contracts/interfaces/protocols/liquityV2/ICollSurplusPool.sol";
import { LiquityV2Claim } from "../../../contracts/actions/liquityV2/trove/LiquityV2Claim.sol";

import { LiquityV2ExecuteActions } from "../../utils/executeActions/LiquityV2ExecuteActions.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestLiquityV2Claim is LiquityV2ExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2Claim cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IAddressesRegistry[] markets;
    address BOLD;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("LiquityV2Claim");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2Claim();

        markets = getMarkets();
        BOLD = markets[0].boldToken();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_claim_collateral() public {
        bool isDirect = false;
        _baseTest(isDirect);
    }

    function test_should_claim_collateral_direct_action() public {
        bool isDirect = false;
        _baseTest(isDirect);
    }

    function _baseTest(bool _isDirect) public {
        for (uint256 i = 0; i < markets.length; i++) {
            _claim(markets[i], _isDirect);
        }
    }

    function _claim(IAddressesRegistry _market, bool _isDirect) internal {
        ITroveManager troveManager = ITroveManager(_market.troveManager());
        ICollSurplusPool collSurplusPool = ICollSurplusPool(_market.collSurplusPool());
        address collToken = _market.collToken();

        uint256 claimableColl = 10_000;

        // simulate collateral claim from liquidation
        vm.startPrank(address(troveManager));
        collSurplusPool.accountSurplus(walletAddr, claimableColl);
        vm.stopPrank();
        give(collToken, address(collSurplusPool), claimableColl);

        bytes memory executeActionCallData =
            executeActionCalldata(liquityV2ClaimEncode(address(_market), sender), _isDirect);

        uint256 senderCollBalanceBefore = balanceOf(collToken, sender);
        wallet.execute(address(cut), executeActionCallData, 0);
        uint256 senderCollBalanceAfter = balanceOf(collToken, sender);
        assertEq(senderCollBalanceAfter, senderCollBalanceBefore + claimableColl);
    }
}
