// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquityOpen is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (
            uint256 maxFeePercentage,
            uint256 collAmount,
            uint256 lusdAmount,
            address from,
            address to,
            address upperHint,
            address lowerHint
        )= parseInputs(_callData);

        maxFeePercentage = _parseParamUint(maxFeePercentage, _paramMapping[0], _subData, _returnValues);
        collAmount = _parseParamUint(collAmount, _paramMapping[1], _subData, _returnValues);
        lusdAmount = _parseParamUint(lusdAmount, _paramMapping[2], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[3], _subData, _returnValues);
        to = _parseParamAddr(from, _paramMapping[4], _subData, _returnValues);

        uint256 troveOwner = _liquityOpen(maxFeePercentage, collAmount, lusdAmount, from, to, upperHint, lowerHint);
        return bytes32(troveOwner);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public virtual payable override {
        (
            uint256 maxFeePercentage,
            uint256 collAmount,
            uint256 lusdAmount,
            address from,
            address to,
            address upperHint,
            address lowerHint
        )= parseInputs(_callData);

        _liquityOpen(maxFeePercentage, collAmount, lusdAmount, from, to, upperHint, lowerHint);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Opens up a trove
    /// @param _maxFeePercentage Highest borrowing fee to accept, ranges between 0.5 and 5%
    /// @param _collAmount Amount of WETH tokens to supply as collateral
    /// @param _lusdAmount Amount of LUSD tokens to borrow from the trove, protocol minimum net debt is 1800
    /// @param _from Address where to pull the collateral from
    /// @param _to Address that will receive the borrowed tokens
    function _liquityOpen(
        uint256 _maxFeePercentage,
        uint256 _collAmount,
        uint256 _lusdAmount,
        address _from,
        address _to,
        address _upperHint,
        address _lowerHint
    ) internal returns (uint256) {
        if (_collAmount == type(uint256).max) {
            _collAmount = TokenUtils.WETH_ADDR.getBalance(_from);
        }
        TokenUtils.WETH_ADDR.pullTokensIfNeeded(_from, _collAmount);
        TokenUtils.withdrawWeth(_collAmount);

        BorrowerOperations.openTrove{value: _collAmount}(_maxFeePercentage, _lusdAmount, _upperHint, _lowerHint);

        LUSDTokenAddr.withdrawTokens(_to, _lusdAmount);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityOpen",
            abi.encode(_maxFeePercentage, _collAmount, _lusdAmount, _from, _to)
        );

        return _collAmount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 maxFeePercentage,
            uint256 collAmount,
            uint256 lusdAmount,
            address from,
            address to,
            address upperHint,
            address lowerHint
        )
    {
        maxFeePercentage = abi.decode(_callData[0], (uint256));
        collAmount = abi.decode(_callData[1], (uint256));
        lusdAmount = abi.decode(_callData[2], (uint256));
        from = abi.decode(_callData[3], (address));
        to = abi.decode(_callData[4], (address));
        upperHint = abi.decode(_callData[5], (address));
        lowerHint = abi.decode(_callData[6], (address));
    }
}