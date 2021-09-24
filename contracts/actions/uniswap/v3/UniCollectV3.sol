// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../ActionBase.sol";
import "../../../utils/TokenUtils.sol";
import "../../../interfaces/uniswap/v3/IUniswapV3NonfungiblePositionManager.sol";

/// @title Collects tokensOwed from a position represented by tokenId
contract UniCollectV3 is ActionBase{
    using TokenUtils for address;
    IUniswapV3NonfungiblePositionManager public constant positionManager =
        IUniswapV3NonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);
    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        IUniswapV3NonfungiblePositionManager.CollectParams memory uniData = parseInputs(_callData);
        
        uniData.tokenId = _parseParamUint(uniData.tokenId, _paramMapping[0], _subData, _returnValues);
        
        (uint256 amount0, ) = _uniCollect(uniData);
        return bytes32(amount0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        IUniswapV3NonfungiblePositionManager.CollectParams memory uniData = parseInputs(_callData);
        
        _uniCollect(uniData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////
    
    /// @dev collects from tokensOwed on position, sends to recipient, up to amountMax
    /// @return amount0 sent to the recipient
    function _uniCollect(IUniswapV3NonfungiblePositionManager.CollectParams memory _uniData)
        internal
        returns (
            uint256 amount0,
            uint256 amount1
        )
    {
        (amount0, amount1) = positionManager.collect(_uniData);

        logger.Log(
                address(this),
                msg.sender,
                "UniCollectV3",
                abi.encode(_uniData, amount0, amount1)
            );
    }
        
    function parseInputs(bytes memory _callData)
       public
        pure
        returns (
            IUniswapV3NonfungiblePositionManager.CollectParams memory uniData
        )
    {
        uniData = abi.decode(_callData, (IUniswapV3NonfungiblePositionManager.CollectParams));
    }
}