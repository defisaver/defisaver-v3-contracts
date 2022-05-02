// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/convex/IBooster.sol";
import "../../interfaces/convex/IBaseRewardPool.sol";
import "../../utils/TokenUtils.sol";
import "./helpers/ConvexHelper.sol";
import "../ActionBase.sol";

contract ConvexDeposit is ConvexHelper, ActionBase {
    using TokenUtils for address;

    /// @param from address from which to pull wrapped LP tokens if option is STAKE,
    /// otherwise LP tokens are pulled
    /// @param to address that will receive wrapped LP tokens if option is WRAP,
    /// otherwise it is the address for which to stake
    /// @param poolId curve pool id according to Convex Booster contract
    struct Params {
        address from;
        address to;
        uint256 poolId;
        uint256 amount;
        DepositOption option;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes calldata _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.from = _parseParamAddr(params.from, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.poolId = _parseParamUint(params.poolId, _paramMapping[2], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[3], _subData, _returnValues);
        params.option = DepositOption(_parseParamUint(uint8(params.option), _paramMapping[4], _subData, _returnValues));

        (uint256 transientAmount, bytes memory logData) = _deposit(params);
        emit ActionEvent("ConvexDeposit", logData);
        return bytes32(transientAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes calldata _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _deposit(params);
        logger.logActionDirectEvent("ConvexDeposit", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /// @notice Action that either deposits(wraps) Curve LP into convex, stakes wrapped LP, or does both
    function _deposit(Params memory _params) internal returns (uint256 transientAmount, bytes memory logData) {
        IBooster.PoolInfo memory poolInfo = IBooster(BOOSTER_ADDR).poolInfo(_params.poolId);

        if (_params.option == DepositOption.WRAP) {
            _params.amount = poolInfo.lpToken.pullTokensIfNeeded(_params.from, _params.amount);
            poolInfo.lpToken.approveToken(BOOSTER_ADDR, _params.amount);
            IBooster(BOOSTER_ADDR).deposit(_params.poolId, _params.amount, false);

            poolInfo.token.withdrawTokens(_params.to, _params.amount);
        } else
        if (_params.option == DepositOption.STAKE) {
            _params.amount = poolInfo.token.pullTokensIfNeeded(_params.from, _params.amount);
            poolInfo.token.approveToken(poolInfo.crvRewards, _params.amount);
            IBaseRewardPool(poolInfo.crvRewards).stakeFor(_params.to, _params.amount);
        } else
        if (_params.option == DepositOption.WRAP_AND_STAKE) {
            bool stakeForProxy = _params.to == address(this);
            
            _params.amount = poolInfo.lpToken.pullTokensIfNeeded(_params.from, _params.amount);
            poolInfo.lpToken.approveToken(BOOSTER_ADDR, _params.amount);
            IBooster(BOOSTER_ADDR).deposit(_params.poolId, _params.amount, stakeForProxy);

            if (!stakeForProxy) {
                poolInfo.token.approveToken(poolInfo.crvRewards, _params.amount);
                IBaseRewardPool(poolInfo.crvRewards).stakeFor(_params.to, _params.amount);
            }
        }

        transientAmount = _params.amount;
        logData = abi.encode(_params);
    }

    function parseInputs(bytes calldata _callData) internal pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}