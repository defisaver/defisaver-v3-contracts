// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

/// @title Creates a Chicken Bond from a proxy
contract CBCreate is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @param amount LUSD token amount to pull
    /// @param from Account from where to pull LUSD amount
    struct Params {
        uint256 amount;
        address from;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.amount = _parseParamUint(
            params.amount,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);

        (uint256 bondId, bytes memory logData) = _cbCreateBond(params);
        emit ActionEvent("CBCreate", logData);
        return bytes32(bondId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _cbCreateBond(params);
        logger.logActionDirectEvent("CBCreate", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @dev If amount == max.uint it will pull whole balance of .from
    function _cbCreateBond(Params memory _params) internal returns (uint256, bytes memory) {
        _params.amount = LUSD_TOKEN_ADDRESS.pullTokensIfNeeded(_params.from, _params.amount);

        LUSD_TOKEN_ADDRESS.approveToken(address(CBManager), _params.amount);

        uint256 bondId = CBManager.createBond(_params.amount);

        bytes memory logData = abi.encode(bondId, _params.amount, _params.from);
        return (bondId, logData);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
