// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquityWithdraw is ActionBase, LiquityHelper {
    using TokenUtils for address;

    struct Params {
        uint256 collAmount; // Amount of WETH tokens to withdraw
        address to;         // Address that will receive the tokens
        address upperHint;
        address lowerHint;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.collAmount = _parseParamUint(
            params.collAmount,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        params.collAmount = _liquityWithdraw(params);
        return bytes32(params.collAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _liquityWithdraw(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Withdraws collateral from the trove
    function _liquityWithdraw(Params memory _params) internal returns (uint256) {
        BorrowerOperations.withdrawColl(_params.collAmount, _params.upperHint, _params.lowerHint);

        TokenUtils.depositWeth(_params.collAmount);
        TokenUtils.WETH_ADDR.withdrawTokens(_params.to, _params.collAmount);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityWithdraw",
            abi.encode(_params.collAmount, _params.to)
        );

        return _params.collAmount;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData[0], (Params));
    }
}
