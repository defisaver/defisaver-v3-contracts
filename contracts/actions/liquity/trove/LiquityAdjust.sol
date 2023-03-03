// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

/// @title Adjusts a Trove by depositing or withdrawing collateral and borrowing or repaying debt.
contract LiquityAdjust is ActionBase, LiquityHelper {
    using TokenUtils for address;

    enum CollChange { SUPPLY, WITHDRAW }
    enum DebtChange { PAYBACK, BORROW }

    struct Params {
        uint256 maxFeePercentage;   // Highest borrowing fee to accept, ranges between 0.5 and 5%
        uint256 collAmount;         // Amount of ETH to supply/withdraw
        uint256 lusdAmount;         // Amount of LUSD tokens to borrow/payback
        CollChange collChange;      // Whether to supply or withdraw collateral
        DebtChange debtChange;      // Whether to borrow or payback debt
        address from;               // Address where to pull the tokens from
        address to;                 // Address that will receive the tokens
        address upperHint;
        address lowerHint;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.maxFeePercentage = _parseParamUint(
            params.maxFeePercentage,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.lusdAmount = _parseParamUint(
            params.lusdAmount,
            _paramMapping[1],
            _subData,
            _returnValues
        );
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);

        (uint256 borrowedAmount, bytes memory logData) = _liquityAdjust(params);
        emit ActionEvent("LiquityAdjust", logData);
        return bytes32(borrowedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _liquityAdjust(params);
        logger.logActionDirectEvent("LiquityAdjust", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _liquityAdjust(Params memory _params) internal returns (uint256, bytes memory) {
        uint supplyAmount = 0;

        if (_params.collChange == CollChange.SUPPLY) {
            if (_params.collAmount == type(uint256).max) {
                _params.collAmount = TokenUtils.WETH_ADDR.getBalance(_params.from);
            }

            TokenUtils.WETH_ADDR.pullTokensIfNeeded(_params.from, _params.collAmount);
            TokenUtils.withdrawWeth(_params.collAmount);

            supplyAmount = _params.collAmount;
            _params.collAmount = 0; // when supplying it's sent as eth this should be 0
        }

        if (_params.debtChange == DebtChange.PAYBACK) {
            uint256 wholeDebt = TroveManager.getTroveDebt(address(this));

            if (_params.lusdAmount == type(uint256).max) {
                _params.lusdAmount = LUSD_TOKEN_ADDRESS.getBalance(_params.from);
            }

            // can't close with payback, pull amount to payback to MIN_DEBT
            if (wholeDebt < (_params.lusdAmount + MIN_DEBT)) {
                _params.lusdAmount = wholeDebt - MIN_DEBT;
            }

            LUSD_TOKEN_ADDRESS.pullTokensIfNeeded(_params.from, _params.lusdAmount);
        }

        BorrowerOperations.adjustTrove{value: supplyAmount}(
            _params.maxFeePercentage,
            _params.collAmount,
            _params.lusdAmount,
            _params.debtChange == DebtChange.BORROW,
            _params.upperHint,
            _params.lowerHint
        );

        if (_params.collChange == CollChange.WITHDRAW) {
            TokenUtils.depositWeth(_params.collAmount);
            TokenUtils.WETH_ADDR.withdrawTokens(_params.to, _params.collAmount);
        }

        if (_params.debtChange == DebtChange.BORROW) {
            LUSD_TOKEN_ADDRESS.withdrawTokens(_params.to, _params.lusdAmount);
        }

        bytes memory logData = abi.encode(_params.maxFeePercentage, _params.lusdAmount, _params.to);
        return (_params.lusdAmount, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory _params) {
        _params = abi.decode(_callData, (Params));
    }
}
