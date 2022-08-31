// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import '../ActionBase.sol';
import './helpers/CompV3Helper.sol';
import './helpers/MainnetCompV3Addresses.sol';
import '../../interfaces/compoundV3/ICometRewards.sol';
import '../../interfaces/IERC20.sol';

/// @title Claims Comp reward for the specified user
contract CompV3Claim is ActionBase, CompV3Helper {
    struct Params {
        address onBehalf;
        address to;
        bool shouldAccrue;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.onBehalf = _parseParamAddr(params.onBehalf, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.shouldAccrue =
            _parseParamUint(
                params.shouldAccrue ? 1 : 0,
                _paramMapping[2],
                _subData,
                _returnValues
            ) == 1;
            
        (uint256 compClaimed, bytes memory logData) = _claim(
            params.onBehalf,
            params.to,
            params.shouldAccrue
        );
        emit ActionEvent('CompV3Claim', logData);
        return bytes32(compClaimed);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _claim(params.onBehalf, params.to, params.shouldAccrue);
        logger.logActionDirectEvent('CompV3Claim', logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Claim rewards of token type from a comet instance to a target address
    /// @param _src The owner to claim for
    /// @param _to The address to receive the rewards
    /// @param _shouldAccrue  If true, the protocol will account for the rewards owed to the account as of the current block before transferring
    function _claim(
        address _src,
        address _to,
        bool _shouldAccrue
    ) internal returns (uint256 compClaimed, bytes memory logData) {
        address baseToken = IComet(COMET_ADDR).baseToken();

        uint256 balanceBefore = IERC20(baseToken).balanceOf(address(this));

        ICometRewards(COMET_REWARDS_ADDR).claimTo(COMET_ADDR, _src, _to, _shouldAccrue);

        uint256 balanceAfter = IERC20(baseToken).balanceOf(address(this));

        compClaimed = balanceBefore - balanceAfter;

        logData = abi.encode(_src, _to, _shouldAccrue, compClaimed);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
