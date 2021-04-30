// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../../DS/DSMath.sol";
import "../../ActionBase.sol";
import "../../../utils/TokenUtils.sol";
import "../../../interfaces/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";

/// @title Decreases liquidity from a position represented by tokenID, and collects token from position to recipient
contract UniWithdrawV3 is ActionBase, DSMath{
    using TokenUtils for address;
    //TODO CHANGE ADDRESS
    IUniswapV3NonfungiblePositionManager public constant positionManager =
        IUniswapV3NonfungiblePositionManager(0x0);

    /// @param tokenId - The ID of the token for which liquidity is being decreased
    /// @param liquidity -The amount by which liquidity will be decreased,
    /// @param amount0Min - The minimum amount of token0 that should be accounted for the burned liquidity,
    /// @param amount1Min - The minimum amount of token1 that should be accounted for the burned liquidity,
    /// @param deadline - The time by which the transaction must be included to effect the change
    /// @param recipient - accounts to receive the tokens
    /// @param amount0Max - The maximum amount of token0 to collect
    /// @param amount1Max - The maximum amount of token1 to collect
    struct Params{
        uint256 tokenId;
        uint128 liquidity;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
        address recipient;
        uint128 amount0Max;
        uint128 amount1Max;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory uniData = parseInputs(_callData);
        
        uniData.amount0Min = _parseParamAddr(uniData.amount0Min, _paramMapping[0], _subData, _returnValues);
        uniData.amount1Min = _parseParamAddr(uniData.amount1Min, _paramMapping[1], _subData, _returnValues);
        uniData.recipient = _parseParamAddr(uniData.recipient, _paramMapping[2], _subData, _returnValues);
        uniData.amount0Max = _parseParamAddr(uniData.amount0Max, _paramMapping[3], _subData, _returnValues);
        uniData.amount1Max = _parseParamAddr(uniData.amount1Max, _paramMapping[4], _subData, _returnValues);

        (uint256 amount0, uint256 amount1)= _uniWithdrawFromPosition(uniData);
        return bytes32(); //TODO what to return
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory uniData = parseInputs(_callData);
        
        _uniWithdrawFromPosition(uniData);
        
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @return amounts of token0 and token1 collected and sent to the recipient
    function _uniWithdrawFromPosition(Params memory _uniData)
        internal
        returns(uint256 amount0, uint256 amount1)
    {
        //amount0 and amount1 now transfer to tokensOwed on position
        _uniWithdraw(_uniData);

        (uint256 amount0, uint256 amount1) = _uniCollect(_uniData);
        
        logger.Log(
                address(this),
                msg.sender,
                "UniWithdrawV3",
                abi.encode(_uniData, amount0, amount1)
            );

    }

    /// @dev Burns liquidity stated, amount0Min and amount1Min are the least you get for burning that liquidity (else reverted),
    /// @return returns how much tokens were added to tokensOwed on position
    function _uniWithdraw(Params memory _uniData)
        internal
        returns (
            uint256 amount0,
            uint256 amount1
        )
    {
        IUniswapV3NonfungiblePositionManager.DecreaseLiquidityParams memory decreaseLiquidityParams = 
            IUniswapV3NonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: _uniData.tokenId,
                liquidity: _uniData.liquidity,
                amount0Min: _uniData.amount0Min,
                amount1Min: _uniData.amount1Min,
                deadline: _uniData.deadline
            });
        (amount0, amount1) = positionManager.decreaseLiquidity(decreaseLiquidityParams);
    }
    
    /// @dev collects from tokensOwed on position, sends to recipient, up to amountMax
    /// @return amount sent to the recipient
    function _uniCollect(Params memory _uniData)
        internal
        returns (
            uint256 amount0,
            uint256 amount1
        )
    {
        IUniswapV3NonfungiblePositionManager.CollectParams memory collectParams = 
            IUniswapV3NonfungiblePositionManager.CollectParams({
                tokenId: _uniData.tokenId,
                recipient: _uniData.recipient,
                amount0Max: _uniData.amount0Max,
                amount1Max: _uniData.amount1Max
            })
        (amount0, amount1) = positionManager.collect(collectParams);
    }
        
    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            Params memory uniData
        )
    {
        uniData = abi.decode(_callData[0], (Params));
    }
}