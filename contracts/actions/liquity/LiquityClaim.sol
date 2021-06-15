// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;
pragma experimental ABIEncoderV2;

import "./helpers/LiquityHelper.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";

contract LiquityClaim is ActionBase, LiquityHelper {
    using TokenUtils for address;

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        address to = parseInputs(_callData);
        to = _parseParamAddr(to, _paramMapping[0], _subData, _returnValues);

        uint256 claimedColl = _liquityClaim(to);
        return bytes32(claimedColl);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable virtual override {
        address to = parseInputs(_callData);

        _liquityClaim(to);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Claims remaining collateral from the user's closed Trove
    function _liquityClaim(address _to) internal returns (uint256) {
        uint256 claimableColl = CollSurplusPool.getCollateral(address(this));

        BorrowerOperations.claimCollateral();   // Will revert if claimableColl == 0

        TokenUtils.depositWeth(claimableColl);
        TokenUtils.WETH_ADDR.withdrawTokens(_to, claimableColl);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityClaim",
            abi.encode(
                _to,
                claimableColl
            )
        );

        return claimableColl;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (address to) {
        to = abi.decode(_callData[0], (address));
    }
}
