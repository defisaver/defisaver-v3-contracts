// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;
import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../../utils/SafeMath.sol";
import "../../ActionBase.sol";

contract LiquityClose is ActionBase, LiquityHelper {
    using TokenUtils for address;

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

        uint256 coll = _liquityClose(inputData.from, inputData.to);
        return bytes32(coll);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory inputData = parseInputs(_callData);

        _liquityClose(inputData.from, inputData.to);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Closes the trove
    /// @param _from Address where to pull the LUSD tokens from
    /// @param _to Address that will receive the collateral
    function _liquityClose(address _from, address _to) internal returns (uint256) {
        uint256 netDebt = TroveManager.getTroveDebt(address(this)) - LUSD_GAS_COMPENSATION;
        uint256 coll = TroveManager.getTroveColl(address(this));

        LUSDTokenAddr.pullTokensIfNeeded(_from, netDebt);

        BorrowerOperations.closeTrove();

        TokenUtils.depositWeth(coll);
        TokenUtils.WETH_ADDR.withdrawTokens(_to, coll);

        logger.Log(address(this), msg.sender, "LiquityClose", abi.encode(_from, _to, netDebt, coll));

        return uint256(coll);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
