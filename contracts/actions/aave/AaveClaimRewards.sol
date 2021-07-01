// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";

contract AaveClaimRewards is ActionBase, AaveHelper {

    struct Params {
        address[] assets;
        uint256 amount;     // Amount of rewards to claim
        address onBehalf;   // Address to check and claim rewards
        address to;         // Address that will be receiving the rewards
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);

        uint256 claimedAmount = _aaveClaimRewards(params);

        return bytes32(claimedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        _aaveClaimRewards(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Claims rewards on behalf of user, on all the assets of the lending pool, accumulating the pending rewards
    function _aaveClaimRewards(Params memory _params) internal returns (uint256 claimedAmount) {
        // amount 0 is safe
        // amount > unclaimedRewards is safe
        // if onBehalf != msg.sender the caller must be whitelisted via "allowClaimOnBehalf" function by the RewardsAdmin role manager
        claimedAmount = AaveIncentivesController.claimRewardsOnBehalf(
            _params.assets,
            _params.amount,
            _params.onBehalf,
            _params.to
        );
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory params)
    {
        params = abi.decode(_callData[0], (Params));
    }
}
