// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import {
    IAddressesRegistry
} from "../../../contracts/interfaces/protocols/liquityV2/IAddressesRegistry.sol";
import { ITroveManager } from "../../../contracts/interfaces/protocols/liquityV2/ITroveManager.sol";
import { IHintHelpers } from "../../../contracts/interfaces/protocols/liquityV2/IHintHelpers.sol";
import { IPriceFeed } from "../../../contracts/interfaces/protocols/liquityV2/IPriceFeed.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import { LiquityV2Open } from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";

import { LiquityV2TestHelper } from "../../actions/liquityV2/LiquityV2TestHelper.t.sol";
import { ExecuteActionsBase } from "./ExecuteActionsBase.sol";
import { SmartWallet } from "../SmartWallet.sol";
import { LiquityV2Encode } from "../encode/LiquityV2Encode.sol";

contract LiquityV2ExecuteActions is ExecuteActionsBase, LiquityV2TestHelper {
    struct OpenTroveParams {
        IAddressesRegistry market;
        address batchManager;
        uint256 collAmountInUSD;
        uint256 collIndex;
        uint256 borrowAmountInUSD;
        uint256 annualInterestRate;
        uint256 nonce;
    }

    struct LiquityV2OpenLocalVars {
        address collToken;
        address wethToken;
        address bold;
        IHintHelpers hintHelpers;
        uint256 interestRate;
        uint256 upperHint;
        uint256 lowerHint;
        uint256 collPriceWAD;
        uint256 collAmount;
        uint256 borrowAmount;
        uint256 predictMaxUpfrontFee;
        bytes openCalldata;
    }

    function executeLiquityOpenTrove(
        OpenTroveParams memory _params,
        SmartWallet _wallet,
        LiquityV2Open _openContract,
        LiquityV2View _viewContract
    ) internal returns (uint256 troveId) {
        LiquityV2OpenLocalVars memory vars;

        vars.collToken = _params.market.collToken();
        vars.wethToken = _params.market.WETH();
        vars.bold = _params.market.boldToken();
        vars.hintHelpers = IHintHelpers(_params.market.hintHelpers());

        vars.interestRate = _params.batchManager != address(0)
            ? ITroveManager(_params.market.troveManager())
            .getLatestBatchData(_params.batchManager)
            .annualInterestRate
            : _params.annualInterestRate;

        (vars.upperHint, vars.lowerHint) = getInsertPosition(
            _viewContract, _params.market, _params.collIndex, _params.annualInterestRate
        );

        vars.collPriceWAD = IPriceFeed(_params.market.priceFeed()).lastGoodPrice();
        vars.collAmount =
            amountInUSDPriceMock(vars.collToken, _params.collAmountInUSD, vars.collPriceWAD / 1e10);
        vars.borrowAmount = amountInUSDPriceMock(vars.bold, _params.borrowAmountInUSD, 1e8);

        vars.predictMaxUpfrontFee = _params.batchManager != address(0)
            ? vars.hintHelpers
                .predictOpenTroveAndJoinBatchUpfrontFee(
                    _params.collIndex, vars.borrowAmount, _params.batchManager
                )
            : vars.hintHelpers
                .predictOpenTroveUpfrontFee(
                    _params.collIndex, vars.borrowAmount, _params.annualInterestRate
                );

        if (vars.collToken == vars.wethToken) {
            give(vars.wethToken, _wallet.owner(), vars.collAmount + ETH_GAS_COMPENSATION);
            _wallet.ownerApprove(vars.wethToken, vars.collAmount + ETH_GAS_COMPENSATION);
        } else {
            give(vars.wethToken, _wallet.owner(), ETH_GAS_COMPENSATION);
            _wallet.ownerApprove(vars.wethToken, ETH_GAS_COMPENSATION);
            give(vars.collToken, _wallet.owner(), vars.collAmount);
            _wallet.ownerApprove(vars.collToken, vars.collAmount);
        }

        vars.openCalldata = abi.encodeWithSelector(
            EXECUTE_ACTION_DIRECT_SELECTOR,
            LiquityV2Encode.open(
                address(_params.market),
                _wallet.owner(),
                _wallet.owner(),
                _params.batchManager,
                _params.nonce,
                vars.collAmount,
                vars.borrowAmount,
                vars.upperHint,
                vars.lowerHint,
                vars.interestRate,
                vars.predictMaxUpfrontFee
            )
        );

        _wallet.execute(address(_openContract), vars.openCalldata, 0);

        troveId = uint256(
            keccak256(abi.encode(_wallet.walletAddr(), _wallet.walletAddr(), _params.nonce))
        );
    }
}
