// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../contracts/interfaces/liquityV2/IAddressesRegistry.sol";
import { ITroveManager } from "../../../contracts/interfaces/liquityV2/ITroveManager.sol";
import { IHintHelpers } from "../../../contracts/interfaces/liquityV2/IHintHelpers.sol";
import { IPriceFeed } from "../../../contracts/interfaces/liquityV2/IPriceFeed.sol";
import { LiquityV2View } from "../../../contracts/views/LiquityV2View.sol";
import { LiquityV2Open } from "../../../contracts/actions/liquityV2/trove/LiquityV2Open.sol";

import { LiquityV2TestHelper } from "../../actions/liquityV2/LiquityV2TestHelper.t.sol";
import { ExecuteActionsBase } from "./ExecuteActionsBase.sol";
import { SmartWallet } from "../SmartWallet.sol";

contract LiquityV2ExecuteActions is ExecuteActionsBase, LiquityV2TestHelper {

    struct OpenTroveVars {
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
        IAddressesRegistry _market,
        address _batchManager,
        uint256 _collAmountInUSD,
        uint256 _collIndex,
        uint256 _borrowAmountInUSD,
        uint256 _annualInterestRate,
        uint256 _nonce,
        SmartWallet _wallet,
        LiquityV2Open _openContract,
        LiquityV2View _viewContract
    ) internal returns (uint256 troveId) {
        OpenTroveVars memory vars;

        vars.collToken = _market.collToken();
        vars.wethToken = _market.WETH();
        vars.bold = _market.boldToken();
        vars.hintHelpers = IHintHelpers(_market.hintHelpers());

        vars.interestRate = _batchManager != address(0)
            ? ITroveManager(_market.troveManager()).getLatestBatchData(_batchManager).annualInterestRate
            : _annualInterestRate;

        (vars.upperHint, vars.lowerHint) = getInsertPosition(
            _viewContract,
            _market,
            _collIndex,
            _annualInterestRate
        );

        vars.collPriceWAD = IPriceFeed(_market.priceFeed()).lastGoodPrice();
        vars.collAmount = amountInUSDPriceMock(vars.collToken, _collAmountInUSD, vars.collPriceWAD / 1e10);
        vars.borrowAmount = amountInUSDPriceMock(vars.bold, _borrowAmountInUSD, 1e8);

        vars.predictMaxUpfrontFee = _batchManager != address(0)
                ? vars.hintHelpers.predictOpenTroveAndJoinBatchUpfrontFee(_collIndex, vars.borrowAmount, _batchManager)
                : vars.hintHelpers.predictOpenTroveUpfrontFee(_collIndex, vars.borrowAmount, _annualInterestRate);

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
            liquityV2OpenEncode(
                address(_market),
                _wallet.owner(),
                _wallet.owner(),
                _batchManager,
                _nonce,
                vars.collAmount,
                vars.borrowAmount,
                vars.upperHint,
                vars.lowerHint,
                vars.interestRate,
                vars.predictMaxUpfrontFee
            )
        );

        _wallet.execute(address(_openContract), vars.openCalldata, 0);

        troveId = uint256(keccak256(abi.encode(_wallet.walletAddr(), _wallet.walletAddr(), _nonce)));
    }
}