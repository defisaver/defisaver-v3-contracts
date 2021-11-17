// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "./helpers/GUniHelper.sol";

/// @title Action that adds liquidity to G-UNI pool of interest (mints G-UNI LP tokens)
contract GUniDeposit is ActionBase, DSMath, GUniHelper {
    using TokenUtils for address;
    
    /// @param pool address of G-UNI pool to add liquidity to
    /// @param token0 address of token0
    /// @param token1 address of token1
    /// @param amount0Max the maximum amount of token0 msg.sender willing to input
    /// @param amount1Max the maximum amount of token1 msg.sender willing to input
    /// @param amount0Min the minimum amount of token0 actually input (slippage protection)
    /// @param amount1Min the minimum amount of token1 actually input (slippage protection)
    /// @param to account to receive minted G-UNI tokens
    /// @param from account from which to pull underlying tokens from
    struct Params {
        address pool;
        address token0;
        address token1;
        uint256 amount0Max;
        uint256 amount1Max;
        uint256 amount0Min;
        uint256 amount1Min;
        address to;
        address from;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.amount0Max = _parseParamUint(inputData.amount0Max, _paramMapping[0], _subData, _returnValues);
        inputData.amount1Max = _parseParamUint(inputData.amount1Max, _paramMapping[1], _subData, _returnValues);
        inputData.amount0Min = _parseParamUint(inputData.amount0Min, _paramMapping[2], _subData, _returnValues);
        inputData.amount1Min = _parseParamUint(inputData.amount1Min, _paramMapping[3], _subData, _returnValues);

        uint256 mintedAmount = gUniDeposit(inputData);

        return bytes32(mintedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        gUniDeposit(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function gUniDeposit(Params memory _inputData) internal returns (uint256){
        require (_inputData.to != address(0x0), "Can not send to burn address");

        _inputData.amount0Max = _inputData.token0.pullTokensIfNeeded(_inputData.from, _inputData.amount0Max);
        _inputData.amount1Max = _inputData.token1.pullTokensIfNeeded(_inputData.from, _inputData.amount1Max);

        _inputData.token0.approveToken(G_UNI_ROUTER_02_ADDRESS, _inputData.amount0Max);
        _inputData.token1.approveToken(G_UNI_ROUTER_02_ADDRESS, _inputData.amount1Max);

        (uint256 amount0, uint256 amount1 , uint256 mintAmount) = 
            gUniRouter.addLiquidity(
            _inputData.pool,
            _inputData.amount0Max,
            _inputData.amount1Max,
            _inputData.amount0Min,
            _inputData.amount1Min,
            _inputData.to
        );
        _inputData.token0.withdrawTokens(_inputData.from, sub(_inputData.amount0Max, amount0));
        _inputData.token1.withdrawTokens(_inputData.from, sub(_inputData.amount1Max, amount1));

        logger.Log(address(this), msg.sender, "GUniDeposit", abi.encode(_inputData, mintAmount, amount0, amount1));

        return mintAmount;
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
