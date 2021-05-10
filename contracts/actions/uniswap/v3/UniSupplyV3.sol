// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../../DS/DSMath.sol";
import "../../ActionBase.sol";
import "../../../utils/TokenUtils.sol";
import "../../../interfaces/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";

/// @title Mints NFT that represents a position in uni v3
contract UniSupplyV3 is ActionBase, DSMath{
    using TokenUtils for address;
    IUniswapV3NonfungiblePositionManager public constant positionManager =
        IUniswapV3NonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);

    struct Params {
        uint256 tokenId;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        uint256 deadline;
        address from;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory uniData = parseInputs(_callData);
        
        uniData.amount0Desired = _parseParamUint(uniData.amount0Desired, _paramMapping[0], _subData, _returnValues);
        uniData.amount1Desired = _parseParamUint(uniData.amount1Desired, _paramMapping[1], _subData, _returnValues);
        uniData.from = _parseParamAddr(uniData.from, _paramMapping[2], _subData, _returnValues);
        uniData.amount0Min = _parseParamUint(uniData.amount0Min, _paramMapping[0], _subData, _returnValues);
        uniData.amount1Min = _parseParamUint(uniData.amount1Min, _paramMapping[1], _subData, _returnValues);

        uint128 liquidity = _uniSupplyPosition(uniData);
        return bytes32(uint256(liquidity));
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory uniData = parseInputs(_callData);
        _uniSupplyPosition(uniData);
        
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _uniSupplyPosition(Params memory _uniData)
        internal
        returns(uint128 liquidity)
    {  (address token0, address token1) = _getTokenAdresses(_uniData.tokenId);
        // fetch tokens from address
        uint amount0Pulled = token0.pullTokensIfNeeded(_uniData.from, _uniData.amount0Desired);
        uint amount1Pulled = token1.pullTokensIfNeeded(_uniData.from, _uniData.amount1Desired);

        // approve positionManager so it can pull tokens
        token0.approveToken(address(positionManager), amount0Pulled);
        token1.approveToken(address(positionManager), amount1Pulled);

        _uniData.amount0Desired = amount0Pulled;
        _uniData.amount1Desired = amount1Pulled;

        uint256 amount0;
        uint256 amount1;
        (liquidity, amount0, amount1) = _uniSupply(_uniData);
        logger.Log(
                address(this),
                msg.sender,
                "UniSupplyV3",
                abi.encode(_uniData, liquidity, amount0, amount1)
            );

    }

    function _getTokenAdresses(uint tokenId) internal view returns(address token0, address token1){
        uint256[11] memory ret;
        bytes memory data = abi.encodeWithSignature("positions(uint256)", tokenId);

        assembly {
            let success := staticcall(
                gas(),           // gas remaining
                0xC36442b4a4522E871399CD717aBDD847Ab11FE88,  // destination address
                add(data, 32), // input buffer (starts after the first 32 bytes in the `data` array)
                mload(data),   // input length (loaded from the first 32 bytes in the `data` array)
                ret,           // output buffer
                256             // output length
            )
            if iszero(success) {
                revert(0, 0)
            }
        }
        return (address(ret[2]), address(ret[3]));
    }
    
    /// @dev increases liquidity by token amounts desired
    /// @return liquidity new liquidity amount
    function _uniSupply(Params memory _uniData)
        internal
        returns (
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        IUniswapV3NonfungiblePositionManager.IncreaseLiquidityParams memory increaseLiquidityParams = 
            IUniswapV3NonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: _uniData.tokenId,
                amount0Desired: _uniData.amount0Desired,
                amount1Desired: _uniData.amount1Desired,
                amount0Min: _uniData.amount0Min,
                amount1Min: _uniData.amount1Min,
                deadline: _uniData.deadline
            });
        (liquidity, amount0, amount1) = positionManager.increaseLiquidity(increaseLiquidityParams);
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