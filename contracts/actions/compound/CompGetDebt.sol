// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;
import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../interfaces/compound/ICToken.sol";

/// @title Action that gets debt amount for a single asset on Compound for debtor
contract CompGetDebt is ActionBase {
    using TokenUtils for address;

    struct Params {
        address tokenAddr;
        address debtorAddr;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public virtual override payable returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        uint256 debtAmount = ICToken(inputData.tokenAddr).borrowBalanceCurrent(inputData.debtorAddr);
        return bytes32(debtAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes[] memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseInputs(bytes[] memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}
