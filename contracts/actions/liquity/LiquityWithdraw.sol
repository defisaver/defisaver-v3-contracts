// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquityWithdraw is ActionBase, LiquityHelper {
    using TokenUtils for address;
    
    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (uint256 collAmount, address to, address upperHint, address lowerHint) = parseInputs(_callData);

        collAmount = _parseParamUint(collAmount, _paramMapping[0], _subData, _returnValues);
        to = _parseParamAddr(to, _paramMapping[1], _subData, _returnValues);

        collAmount = _liquityWithdraw(collAmount, to, upperHint, lowerHint);
        return bytes32(collAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public virtual payable override {
        (uint256 collAmount, address to, address upperHint, address lowerHint) = parseInputs(_callData);

        _liquityWithdraw(collAmount, to, upperHint, lowerHint);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraw ETH collateral from a trove
    function _liquityWithdraw(uint256 _collAmount, address _to, address _upperHint, address _lowerHint) internal returns (uint256) {
        if (_collAmount == type(uint256).max) {
            _collAmount = TroveManager.getTroveColl(address(this));
        }
        
        BorrowerOperations.withdrawColl(_collAmount, _upperHint, _lowerHint);
        
        TokenUtils.depositWeth(_collAmount);
        TokenUtils.WETH_ADDR.withdrawTokens(_to, _collAmount);
        
        logger.Log(
            address(this),
            msg.sender,
            "LiquityWithdraw",
            abi.encode(_collAmount, _to)
        );

        return _collAmount;
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (uint256 collAmount, address to, address upperHint, address lowerHint)
    {
        collAmount = abi.decode(_callData[0], (uint256));
        to = abi.decode(_callData[1], (address));
        upperHint = abi.decode(_callData[2], (address));
        lowerHint = abi.decode(_callData[3], (address));
    }
}