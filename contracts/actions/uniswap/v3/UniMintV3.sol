// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../../DS/DSMath.sol";
import "../../ActionBase.sol";
import "../../../utils/TokenUtils.sol";
import "../../../interfaces/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";

/// @title Mints NFT that represents a position in uni v3
contract UniMintV3 is ActionBase, DSMath{
    using TokenUtils for address;
    IUniswapV3NonfungiblePositionManager public constant positionManager =
        IUniswapV3NonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);
    
    struct Params {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
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
        // console.log("test");
        Params memory uniData = parseInputs(_callData);
        
        uniData.token0 = _parseParamAddr(uniData.token0, _paramMapping[0], _subData, _returnValues);
        uniData.token1 = _parseParamAddr(uniData.token1, _paramMapping[1], _subData, _returnValues);
        uniData.from = _parseParamAddr(uniData.from, _paramMapping[2], _subData, _returnValues);
        uniData.recipient = _parseParamAddr(uniData.recipient, _paramMapping[3], _subData, _returnValues);
        uniData.amount0Desired = _parseParamUint(uniData.amount0Desired, _paramMapping[4], _subData, _returnValues);
        uniData.amount1Desired = _parseParamUint(uniData.amount1Desired, _paramMapping[5], _subData, _returnValues);

        uint256 tokenId = _uniCreatePosition(uniData);

        return bytes32(tokenId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory uniData = parseInputs(_callData);
        _uniCreatePosition(uniData);
        
    }
    
    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }
    
    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _uniCreatePosition(Params memory _uniData) internal returns (uint256 tokenId){
            // fetch tokens from address;
            uint amount0Pulled = _uniData.token0.pullTokensIfNeeded(_uniData.from, _uniData.amount0Desired);
        
            uint amount1Pulled = _uniData.token1.pullTokensIfNeeded(_uniData.from, _uniData.amount1Desired);

            // approve positionManager so it can pull tokens
            _uniData.token0.approveToken(address(positionManager), amount0Pulled);
            _uniData.token1.approveToken(address(positionManager), amount1Pulled);

            _uniData.amount0Desired = amount0Pulled;
            _uniData.amount1Desired = amount1Pulled;

            uint128 liquidity;
            uint256 amount0;
            uint256 amount1;
            (tokenId, liquidity, amount0, amount1) = _uniMint(_uniData);

            //send leftovers
            _uniData.token0.withdrawTokens(_uniData.from, sub(_uniData.amount0Desired, amount0));
            _uniData.token1.withdrawTokens(_uniData.from, sub(_uniData.amount1Desired, amount1));
            
            logger.Log(
                address(this),
                msg.sender,
                "UniMintV3",
                abi.encode(_uniData, tokenId, liquidity, amount0, amount1)
            );

            return tokenId;
    }

    /// @dev mints new NFT that represents a position with selected parameters
    /// @return tokenId of new NFT, how much liquidity it now has and token amounts
    function _uniMint(Params memory _uniData)
        internal
        returns(
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {       
        IUniswapV3NonfungiblePositionManager.MintParams memory mintParams = 
                IUniswapV3NonfungiblePositionManager.MintParams({
                    token0: _uniData.token0,
                    token1: _uniData.token1,
                    fee: _uniData.fee,
                    tickLower: _uniData.tickLower,
                    tickUpper: _uniData.tickUpper,
                    amount0Desired: _uniData.amount0Desired,
                    amount1Desired: _uniData.amount1Desired,
                    amount0Min: _uniData.amount0Min,
                    amount1Min: _uniData.amount1Min,
                    recipient: _uniData.recipient,
                    deadline: _uniData.deadline
                });
        (tokenId, liquidity, amount0, amount1) = positionManager.mint(mintParams);
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