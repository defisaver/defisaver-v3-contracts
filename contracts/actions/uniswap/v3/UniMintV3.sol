// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { UniV3Helper } from "./helpers/UniV3Helper.sol";
import { IUniswapV3NonfungiblePositionManager } from "../../../interfaces/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";

/// @title Mints NFT that represents a position in uni v3
contract UniMintV3 is ActionBase, UniV3Helper{
    using TokenUtils for address;

    /// @param token0 Address of the first token
    /// @param token1 Address of the second token
    /// @param fee Fee of the pool
    /// @param tickLower Lower tick of the position
    /// @param tickUpper Upper tick of the position
    /// @param amount0Desired Amount of the first token to add
    /// @param amount1Desired Amount of the second token to add
    /// @param amount0Min Minimum amount of the first token to add
    /// @param amount1Min Minimum amount of the second token to add
    /// @param recipient Address to send the NFT to
    /// @param deadline Deadline of the transaction
    /// @param from Address to pull the tokens from
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
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory uniData = parseInputs(_callData);

        uniData.amount0Desired = _parseParamUint(uniData.amount0Desired, _paramMapping[0], _subData, _returnValues);
        uniData.amount1Desired = _parseParamUint(uniData.amount1Desired, _paramMapping[1], _subData, _returnValues);

        (uint256 tokenId, bytes memory logData) = _uniCreatePosition(uniData);
        emit ActionEvent("UniMintV3", logData);
        return bytes32(tokenId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory uniData = parseInputs(_callData);
        (, bytes memory logData) = _uniCreatePosition(uniData);
        logger.logActionDirectEvent("UniMintV3", logData);
    }
    
    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }
    
    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _uniCreatePosition(Params memory _uniData) internal returns (uint256 tokenId, bytes memory logData){
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
        _uniData.token0.withdrawTokens(_uniData.from, _uniData.amount0Desired - amount0);
        _uniData.token1.withdrawTokens(_uniData.from, _uniData.amount1Desired - amount1);
        
        logData = abi.encode(_uniData, tokenId, liquidity, amount0, amount1);
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

    function parseInputs(bytes memory _callData)
       public
        pure
        returns (
            Params memory uniData
        )
    {   
        uniData = abi.decode(_callData, (Params));
    }
}