// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "./helpers/BalancerV2Helper.sol";

/// @title Return LP tokens to Balancer Vault in exchange for underlying tokens
contract BalancerV2Withdraw is ActionBase, BalancerV2Helper{
    using TokenUtils for address;

    struct Params {
        bytes32 poolId;
        address from;
        address to;
        uint256 lpTokenAmount;
        IAsset[] tokens;
        uint256[] minAmountsOut;
        bytes userData;
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
        inputData.lpTokenAmount = _parseParamUint(
            inputData.lpTokenAmount,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        for (uint256 i = 0; i < inputData.minAmountsOut.length; i++){
            inputData.minAmountsOut[i] = _parseParamUint(inputData.minAmountsOut[i], _paramMapping[3+i], _subData, _returnValues);
        }

        uint256 poolLPTokensSent = _balancerWithdraw(inputData);
        return bytes32(poolLPTokensSent);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _balancerWithdraw(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _balancerWithdraw(Params memory _inputData) internal returns (uint256 poolLPTokensSent){
        require(_inputData.to != address(0), ADDR_MUST_NOT_BE_ZERO);
        address poolAddress = _getPoolAddress(_inputData.poolId);
        uint256 poolLPTokensBefore = poolAddress.getBalance(address(this));

        _inputData.lpTokenAmount = poolAddress.pullTokensIfNeeded(
            _inputData.from,
            _inputData.lpTokenAmount
        );
        poolAddress.approveToken(address(vault), _inputData.lpTokenAmount);

        IVault.ExitPoolRequest memory requestData = IVault.ExitPoolRequest(
            _inputData.tokens,
            _inputData.minAmountsOut,
            _inputData.userData,
            false
        );
        vault.exitPool(_inputData.poolId, address(this), payable(_inputData.to), requestData);

        uint256 poolLPTokensAfter = poolAddress.getBalance(address(this));
        poolLPTokensSent = poolLPTokensAfter - poolLPTokensBefore;
        // return any leftover LP tokens
        poolAddress.withdrawTokens(
            _inputData.from,
            poolLPTokensSent
        );

        logger.Log(
            address(this),
            msg.sender,
            "BalancerV2Withdraw",
            abi.encode(_inputData, poolLPTokensSent)
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
