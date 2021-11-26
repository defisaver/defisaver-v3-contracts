// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "./helpers/AaveHelper.sol";

contract AaveClaimStkAave is ActionBase, AaveHelper {

    struct Params {
        address[] assets;
        uint256 amount;     // Amount of rewards to claim
        address to;         // Address that will be receiving the rewards
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
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);

        uint256 claimedAmount = _aaveClaimStkAave(params);

        return bytes32(claimedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        _aaveClaimStkAave(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Claims stkAave rewards on the assets of the lending pool
    function _aaveClaimStkAave(Params memory _params) internal returns (uint256 claimedAmount) {
        // amount 0 is safe
        // amount > unclaimedRewards is safe
        claimedAmount = AaveIncentivesController.claimRewards(
            _params.assets,
            _params.amount,
            _params.to
        );

        logger.Log(
            address(this),
            msg.sender,
            "AaveClaimStkAave",
            abi.encode(
                _params,
                claimedAmount
            )
        );
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory params)
    {
        params = abi.decode(_callData, (Params));
    }
}
