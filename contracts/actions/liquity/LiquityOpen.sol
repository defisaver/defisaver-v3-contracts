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
            uint256 LUSDAmount,
            address from,
            address to,
            address upperHint,
            address lowerHint
        )= parseInputs(_callData);

        maxFeePercentage = _parseParamUint(maxFeePercentage, _paramMapping[0], _subData, _returnValues);
        collAmount = _parseParamUint(collAmount, _paramMapping[1], _subData, _returnValues);
        LUSDAmount = _parseParamUint(LUSDAmount, _paramMapping[2], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[3], _subData, _returnValues);
        to = _parseParamAddr(from, _paramMapping[4], _subData, _returnValues);

        uint256 troveOwner = _liquityOpen(maxFeePercentage, collAmount, LUSDAmount, from, to, upperHint, lowerHint);
        return bytes32(troveOwner);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public virtual payable override {
        (
            uint256 maxFeePercentage,
            uint256 collAmount,
            uint256 LUSDAmount,
            address from,
            address to,
            address upperHint,
            address lowerHint
        )= parseInputs(_callData);

        _liquityOpen(maxFeePercentage, collAmount, LUSDAmount, from, to, upperHint, lowerHint);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Opens up an empty trove
    function _liquityOpen(
        uint256 _maxFeePercentage,
        uint256 _collAmount,
        uint256 _LUSDAmount,
        address _from,
        address _to,
        address _upperHint,
        address _lowerHint
    ) internal returns (uint256) {
        if (_collAmount == type(uint256).max) {
            _collAmount = TokenUtils.WETH_ADDR.getBalance(_from);
        }

        WETH_ADDR.pullTokensIfNeeded(_from, _collAmount);
        TokenUtils.withdrawWeth(_collAmount);

        BorrowerOperations.openTrove{value: _collAmount}(_maxFeePercentage, _LUSDAmount, _upperHint, _lowerHint);

        LUSDTokenAddr.withdrawTokens(_to, _LUSDAmount);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityOpen",
            abi.encode(_maxFeePercentage, _collAmount, _LUSDAmount, _from, _to)
        );

        return uint256(msg.sender);
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            uint256 maxFeePercentage,
            uint256 collAmount,
            uint256 LUSDAmount,
            address from,
            address to,
            address upperHint,
            address lowerHint
        )
    {
        maxFeePercentage = abi.decode(_callData[0], (uint256));
        collAmount = abi.decode(_callData[1], (uint256));
        LUSDAmount = abi.decode(_callData[2], (uint256));
        from = abi.decode(_callData[3], (address));
        to = abi.decode(_callData[4], (address));
        upperHint = abi.decode(_callData[5], (address));
        lowerHint = abi.decode(_callData[6], (address));
    }
}