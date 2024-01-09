// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";
import "../../interfaces/aave/IStkAave.sol";
import "../../utils/TokenUtils.sol";

contract AaveUnstake is ActionBase, AaveHelper {
    using TokenUtils for address;

    /// @param amount amount of stkAave tokens to burn (max.uint to redeem whole balance)
    /// @param to address to receive AAVE tokens
    struct Params {
        uint256 amount;
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

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);

        (uint256 claimedAmount, bytes memory logData) = _unstake(params);
        emit ActionEvent("AaveUnstake", logData);
        return bytes32(claimedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _unstake(params);
        logger.logActionDirectEvent("AaveUnstake", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _unstake(
        Params memory _params
    ) internal returns (uint256 unstakedAmount, bytes memory logData) {
        if (_params.amount == 0) {
            IStkAave(STAKED_TOKEN_ADDR).cooldown();
        } else {
            address rewardToken = IStkAave(STAKED_TOKEN_ADDR).REWARD_TOKEN();
            uint256 startingAAVEBalance = rewardToken.getBalance(_params.to);
            IStkAave(STAKED_TOKEN_ADDR).redeem(_params.to, _params.amount);
            uint256 endingAAVEBalance = rewardToken.getBalance(_params.to);

            logData = abi.encode(_params, endingAAVEBalance - startingAAVEBalance);
            return (endingAAVEBalance - startingAAVEBalance, logData);
        }
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
