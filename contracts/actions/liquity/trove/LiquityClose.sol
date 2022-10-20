// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/SafeMath.sol";
import "../../ActionBase.sol";

/// @title Closes DSProxy Liquity Trove
contract LiquityClose is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @param from Address where to pull the LUSD tokens from
    /// @param to Address that will receive the collateral
    struct Params {
        address from;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.from = _parseParamAddr(inputData.from, _paramMapping[0], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[1], _subData, _returnValues);

        (uint256 coll, bytes memory logData) = _liquityClose(inputData.from, inputData.to);
        emit ActionEvent("LiquityClose", logData);
        return bytes32(coll);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory inputData = parseInputs(_callData);

        (, bytes memory logData) = _liquityClose(inputData.from, inputData.to);
        logger.logActionDirectEvent("LiquityClose", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Closes the trove
    /// @dev The address from which we are pulling LUSD must approve proxy to pull tokens
    /// @dev This will try to pull netDebt exact amount (TroveDebt - LUSD gas compensation)
    function _liquityClose(address _from, address _to) internal returns (uint256 coll, bytes memory logData) {
        uint256 netDebt = TroveManager.getTroveDebt(address(this)) - LUSD_GAS_COMPENSATION;
        coll = TroveManager.getTroveColl(address(this));

        LUSD_TOKEN_ADDRESS.pullTokensIfNeeded(_from, netDebt);

        BorrowerOperations.closeTrove();

        TokenUtils.depositWeth(coll);
        TokenUtils.WETH_ADDR.withdrawTokens(_to, coll);

        logData = abi.encode(_from, _to, netDebt, coll);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
