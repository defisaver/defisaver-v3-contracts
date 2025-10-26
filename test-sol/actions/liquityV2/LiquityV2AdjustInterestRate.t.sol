// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IAddressesRegistry
} from "../../../contracts/interfaces/protocols/liquityV2/IAddressesRegistry.sol";
import { IHintHelpers } from "../../../contracts/interfaces/protocols/liquityV2/IHintHelpers.sol";
import { LiquityV2Open } from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import {
    LiquityV2AdjustInterestRate
} from "../../../contracts/actions/liquityV2/trove/LiquityV2AdjustInterestRate.sol";

import { LiquityV2ExecuteActions } from "../../utils/executeActions/LiquityV2ExecuteActions.sol";
import { SmartWallet } from "../../utils/SmartWallet.sol";

contract TestLiquityV2AdjustInterestRate is LiquityV2ExecuteActions {
    /*//////////////////////////////////////////////////////////////////////////
                                CONTRACT UNDER TEST
    //////////////////////////////////////////////////////////////////////////*/
    LiquityV2AdjustInterestRate cut;

    /*//////////////////////////////////////////////////////////////////////////
                                    VARIABLES
    //////////////////////////////////////////////////////////////////////////*/

    SmartWallet wallet;
    address sender;
    address walletAddr;
    IAddressesRegistry[] markets;
    address BOLD;
    address WETH;

    LiquityV2View viewContract;
    LiquityV2Open openContract;

    /*//////////////////////////////////////////////////////////////////////////
                                   SETUP FUNCTION
    //////////////////////////////////////////////////////////////////////////*/
    function setUp() public override {
        forkMainnet("LiquityV2AdjustInterestRate");

        wallet = new SmartWallet(bob);
        sender = wallet.owner();
        walletAddr = wallet.walletAddr();

        cut = new LiquityV2AdjustInterestRate();
        viewContract = new LiquityV2View();
        openContract = new LiquityV2Open();

        markets = getMarkets();
        BOLD = markets[0].boldToken();
        WETH = markets[0].collToken();
    }

    /*//////////////////////////////////////////////////////////////////////////
                                      TESTS
    ////////////////////////////////////////////////////////////////////////*/
    function test_should_adjust_interest_rate() public {
        bool isDirect = false;
        _baseTest(isDirect);
    }

    function test_should_adjust_interest_rate_action_direct() public {
        bool isDirect = true;
        _baseTest(isDirect);
    }

    function _baseTest(bool _isDirect) internal {
        uint256 collAmountInUSD = 30_000;
        uint256 borrowAmountInUSD = 10_000;
        uint256 currInterestRate = 1e18 / 10;
        uint256 newInterestRate = 1e18 / 20;

        for (uint256 i = 0; i < markets.length; i++) {
            uint256 troveId = executeLiquityOpenTrove(
                markets[i],
                address(0),
                collAmountInUSD,
                i,
                borrowAmountInUSD,
                currInterestRate,
                0,
                wallet,
                openContract,
                viewContract
            );

            _adjustInterestRate(markets[i], troveId, _isDirect, newInterestRate, i);
        }
    }

    function _adjustInterestRate(
        IAddressesRegistry _market,
        uint256 _troveId,
        bool _isDirect,
        uint256 _newInterestRate,
        uint256 _collIndex
    ) internal {
        uint256 maxUpfrontFee = IHintHelpers(_market.hintHelpers())
            .predictAdjustInterestRateUpfrontFee(_collIndex, _troveId, _newInterestRate);

        (uint256 upperHint, uint256 lowerHint) =
            getInsertPosition(viewContract, _market, _collIndex, _newInterestRate);

        bytes memory executeActionCallData = executeActionCalldata(
            liquityV2AdjustInterestRateEncode(
                address(_market), _troveId, _newInterestRate, upperHint, lowerHint, maxUpfrontFee
            ),
            _isDirect
        );

        wallet.execute(address(cut), executeActionCallData, 0);

        LiquityV2View.TroveData memory troveData =
            viewContract.getTroveInfo(address(_market), _troveId);
        assertEq(troveData.annualInterestRate, _newInterestRate);
    }
}
