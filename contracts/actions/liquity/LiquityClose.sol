// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/SafeMath.sol";
import "../ActionBase.sol";

contract LiquityClose is ActionBase, LiquityHelper {
    using TokenUtils for address;
    using SafeMath for uint256;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        (
            address from,
            uint256 slip
        )= parseInputs(_callData);

        from = _parseParamAddr(from, _paramMapping[0], _subData, _returnValues);
        slip = _parseParamUint(slip, _paramMapping[1], _subData, _returnValues);

        uint256 debtRepaid = _liquityClose(from, slip);
        return bytes32(debtRepaid);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public virtual payable override {
        (
            address from,
            uint256 slip
        )= parseInputs(_callData);

        _liquityClose(from, slip);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Opens up an empty trove
    function _liquityClose(address _from, uint256 _slip) internal returns (uint256) {
        uint256 debt = TroveManager.getTroveDebt(address(this));
        uint256 maxRepay = debt.mul(1e18 + _slip).div(1e18);

        uint256 balanceBefore = LUSDTokenAddr.getBalance(address(this));
        LUSDTokenAddr.pullTokensIfNeeded(_from, maxRepay);
        uint256 balanceMid = LUSDTokenAddr.getBalance(address(this));
        BorrowerOperations.closeTrove();
        uint256 balanceAfter = LUSDTokenAddr.getBalance(address(this));

        // could be a security issue, dust
        LUSDTokenAddr.withdrawTokens(_from, balanceAfter.sub(balanceBefore));

        uint256 debtRepaid = balanceMid.sub(balanceAfter);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityClose",
            abi.encode(_from, _slip, debtRepaid)
        );

        return uint256(debtRepaid);
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            address from,
            uint256 slip
        )
    {
        from = abi.decode(_callData[0], (address));
        slip = abi.decode(_callData[1], (uint256));
    }
}