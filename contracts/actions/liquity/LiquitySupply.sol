// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquitySupply is ActionBase, LiquityHelper {
    using TokenUtils for address;
    
    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint256 collAmount, address from, address upperHint, address lowerHint) = parseInputs(_callData);

        collAmount = _parseParamUint(collAmount, _paramMapping[0], _subData, _returnValues);
        from = _parseParamAddr(from, _paramMapping[1], _subData, _returnValues);

        collAmount = _liquitySupply(collAmount, from, upperHint, lowerHint);
        return bytes32(collAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public virtual payable override {
        (uint256 collAmount, address from, address upperHint, address lowerHint) = parseInputs(_callData);

        _liquitySupply(collAmount, from, upperHint, lowerHint);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Send ETH as collateral to a trove
    function _liquitySupply(uint256 _collAmount, address _from, address _upperHint, address _lowerHint) internal returns (uint256) {
        if (_collAmount == type(uint256).max) {
            _collAmount = TokenUtils.WETH_ADDR.getBalance(_from);
        }
        TokenUtils.WETH_ADDR.pullTokensIfNeeded(_from, _collAmount);
        TokenUtils.withdrawWeth(_collAmount);

        BorrowerOperations.addColl{value: _collAmount}(_upperHint, _lowerHint);

        logger.Log(
            address(this),
            msg.sender,
            "LiquitySupply",
            abi.encode(_collAmount, _from)
        );

        return _collAmount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (uint256 collAmount, address from, address upperHint, address lowerHint)
    {
        collAmount = abi.decode(_callData[0], (uint256));
        from = abi.decode(_callData[1], (address));
        upperHint = abi.decode(_callData[2], (address));
        lowerHint = abi.decode(_callData[3], (address));
    }
}