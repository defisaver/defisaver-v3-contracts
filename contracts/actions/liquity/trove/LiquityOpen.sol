// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

contract LiquityOpen is ActionBase, LiquityHelper {
    using TokenUtils for address;

    struct Params {
        uint256 maxFeePercentage;   // Highest borrowing fee to accept, ranges between 0.5 and 5%
        uint256 collAmount;         // Amount of WETH tokens to supply as collateral
        uint256 lusdAmount;         // Amount of LUSD tokens to borrow from the trove, protocol minimum net debt is 1800
        address from;               // Address where to pull the collateral from
        address to;                 // Address that will receive the borrowed tokens
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
        params.collAmount = _parseParamUint(
            params.collAmount,
            _paramMapping[1],
            _subData,
            _returnValues
        );
        params.lusdAmount = _parseParamUint(
            params.lusdAmount,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[4], _subData, _returnValues);

        uint256 troveOwner = _liquityOpen(params);
        return bytes32(troveOwner);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _liquityOpen(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Opens up a trove
    function _liquityOpen(Params memory _params) internal returns (uint256) {
        if (_params.collAmount == type(uint256).max) {
            _params.collAmount = TokenUtils.WETH_ADDR.getBalance(_params.from);
        }
        TokenUtils.WETH_ADDR.pullTokensIfNeeded(_params.from, _params.collAmount);
        TokenUtils.withdrawWeth(_params.collAmount);

        BorrowerOperations.openTrove{value: _params.collAmount}(
            _params.maxFeePercentage,
            _params.lusdAmount,
            _params.upperHint,
            _params.lowerHint
        );

        LUSDTokenAddr.withdrawTokens(_params.to, _params.lusdAmount);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityOpen",
            abi.encode(
                _params.maxFeePercentage,
                _params.collAmount,
                _params.lusdAmount,
                _params.from,
                _params.to
            )
        );

        return _params.collAmount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
