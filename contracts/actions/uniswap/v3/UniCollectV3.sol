// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../../DS/DSMath.sol";
import "../../ActionBase.sol";
import "../../../utils/TokenUtils.sol";
import "../../../interfaces/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";

/// @title Collects tokensOwed from a position represented by tokenId
contract UniCollectV3 is ActionBase, DSMath{
    using TokenUtils for address;
    //TODO CHANGE ADDRESS
    IUniswapV3NonfungiblePositionManager public constant positionManager =
        IUniswapV3NonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);

    /// @param tokenId - The ID of the token for which liquidity is being decreased
    /// @param recipient - accounts to receive the tokens
    /// @param amount0Max - The maximum amount of token0 to collect
    /// @param amount1Max - The maximum amount of token1 to collect
    struct Params{
        uint256 tokenId;
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
        
        uniData.recipient = _parseParamAddr(uniData.recipient, _paramMapping[0], _subData, _returnValues);
        uniData.amount0Max = uint128(_parseParamUint(uniData.amount0Max, _paramMapping[1], _subData, _returnValues));
        uniData.amount1Max = uint128(_parseParamUint(uniData.amount1Max, _paramMapping[2], _subData, _returnValues));

        _uniCollect(uniData);
        return bytes32(uniData.tokenId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory uniData = parseInputs(_callData);
        
        _uniCollect(uniData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////
    
    /// @dev collects from tokensOwed on position, sends to recipient, up to amountMax
    /// @return amount0 sent to the recipient
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
            });
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