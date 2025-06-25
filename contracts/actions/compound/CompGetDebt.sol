// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/TokenUtils.sol";
import { ICToken } from "../../interfaces/compound/ICToken.sol";

/// @title Action that gets debt amount for a single asset on Compound for debtor.
contract CompGetDebt is ActionBase {
    using TokenUtils for address;

    /// @param cTokenAddr Address of the cToken token to get the debt for
    /// @param debtorAddr Address of the debtor
    struct Params {
        address cTokenAddr;
        address debtorAddr;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public virtual override payable returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        uint256 debtAmount = ICToken(inputData.cTokenAddr).borrowBalanceCurrent(inputData.debtorAddr);
        return bytes32(debtAmount);
    }

    // solhint-disable-next-line no-empty-blocks
    function executeActionDirect(bytes memory _callData) public override payable {}

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
