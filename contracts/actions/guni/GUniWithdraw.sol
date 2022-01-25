// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;
pragma experimental ABIEncoderV2;

import "./../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "./helpers/GUniHelper.sol";

/// @title Action that removes liquidity from a G-UNI pool and burns G-UNI LP tokens
contract GUniWithdraw is ActionBase, DSMath, GUniHelper {
    using TokenUtils for address;
    
    /// @param pool address of G-UNI pool to remove liquidity from
    /// @param burnAmount The number of G-UNI tokens to burn
    /// @param amount0Min Minimum amount of token0 received after burn (slippage protection)
    /// @param amount1Min Minimum amount of token1 received after burn (slippage protection)
    /// @param to The account to receive the underlying amounts of token0 and token1
    /// @param from Account from which to pull G-Uni LP tokens
    struct Params {
        address pool;
        uint256 burnAmount;
        uint256 amount0Min;
        uint256 amount1Min;
        address to;
        address from;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.burnAmount = _parseParamUint(inputData.burnAmount, _paramMapping[0], _subData, _returnValues);

        (uint256 liquidityBurnt, bytes memory logData) = gUniWithdraw(inputData);
        emit ActionEvent("GUniWithdraw", logData);
        return bytes32(liquidityBurnt);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        (, bytes memory logData) = gUniWithdraw(inputData);
        logger.logActionDirectEvent("GUniWithdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function gUniWithdraw(Params memory _inputData) internal returns (uint128, bytes memory) {
        require (_inputData.to != address(0x0), "Can not send to burn address");

        _inputData.burnAmount = _inputData.pool.pullTokensIfNeeded(_inputData.from, _inputData.burnAmount);

        _inputData.pool.approveToken(G_UNI_ROUTER_02_ADDRESS, _inputData.burnAmount);

        (uint256 amount0, uint256 amount1, uint128 liquidityBurnt) = gUniRouter.removeLiquidity(_inputData.pool, _inputData.burnAmount, _inputData.amount0Min, _inputData.amount1Min, _inputData.to);
        /// @dev amountToBurn will always be burnt, so no need to send back any leftovers 

        bytes memory logData = abi.encode(_inputData, amount0, amount1, liquidityBurnt);
        return (liquidityBurnt, logData);
    }

    function parseInputs(bytes memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData, (Params));
    }
}
