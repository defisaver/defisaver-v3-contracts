// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

contract LiquityClaim is ActionBase, LiquityHelper {
    using TokenUtils for address;

    struct Params {
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.to = _parseParamAddr(params.to, _paramMapping[0], _subData, _returnValues);

        (uint256 claimedColl, bytes memory logData) = _liquityClaim(params.to);
        emit ActionEvent("LiquityClaim", logData);
        return bytes32(claimedColl);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _liquityClaim(params.to);
        logger.logActionDirectEvent("LiquityClaim", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Claims remaining collateral from the user's closed Trove
    function _liquityClaim(address _to) internal returns (uint256 claimableColl, bytes memory logData) {
        claimableColl = CollSurplusPool.getCollateral(address(this));

        BorrowerOperations.claimCollateral();   // Will revert if claimableColl == 0

        TokenUtils.depositWeth(claimableColl);
        TokenUtils.WETH_ADDR.withdrawTokens(_to, claimableColl);

        logData = abi.encode(_to, claimableColl);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
